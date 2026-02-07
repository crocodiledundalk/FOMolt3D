# Reinitialization Attacks

Reinitialization attacks exploit programs that fail to verify whether accounts have already been initialized, allowing attackers to overwrite existing data and seize control of valuable accounts.

## Severity: Critical

Successful reinitialization can lead to complete account takeover and loss of all associated assets.

## The Vulnerability

### Core Issue

Every time an unprotected initialization instruction is called, it unconditionally overwrites account data and sets the caller as the new owner, regardless of the account's previous state.

### Vulnerable Pattern (Anchor)

```rust
#[derive(Accounts)]
pub struct Initialize<'info> {
    pub owner: Signer<'info>,
    // VULNERABLE: No init constraint, allows reinitialization
    #[account(mut)]
    pub vault: Account<'info, Vault>,
    pub system_program: Program<'info, System>,
}

pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
    // VULNERABLE: Unconditionally overwrites existing data
    ctx.accounts.vault.owner = ctx.accounts.owner.key();
    ctx.accounts.vault.balance = 0;
    ctx.accounts.vault.is_initialized = true;
    Ok(())
}
```

### Vulnerable Pattern (Pinocchio)

```rust
pub fn process_initialize(accounts: &[AccountInfo]) -> ProgramResult {
    let owner = &accounts[0];
    let vault = &accounts[1];

    // VULNERABLE: No check for existing initialization
    let mut data = vault.try_borrow_mut_data()?;
    let vault_state = VaultState::from_bytes_mut(&mut data)?;

    vault_state.owner = *owner.key();
    vault_state.balance = 0;
    vault_state.is_initialized = true;

    Ok(())
}
```

## Exploit Scenario

### Escrow Takeover

```
Initial state:
  Escrow PDA {
    owner: Alice,
    token_account_a: [has 1000 USDC],
    token_account_b: [has 500 SOL],
    is_initialized: true
  }

Attacker calls initialize(attacker_keypair, escrow_pda)

Result:
  Escrow PDA {
    owner: Attacker,  // Attacker now owns the escrow!
    token_account_a: [still has 1000 USDC],
    token_account_b: [still has 500 SOL],
    is_initialized: true
  }

Attacker can now withdraw all escrowed tokens.
```

## Secure Implementations

### Anchor: Using init Constraint (Recommended)

```rust
#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    // SECURE: init constraint creates new account, fails if exists
    #[account(
        init,
        payer = owner,
        space = 8 + Vault::INIT_SPACE,
        seeds = [b"vault", owner.key().as_ref()],
        bump,
    )]
    pub vault: Account<'info, Vault>,
    pub system_program: Program<'info, System>,
}
```

The `init` constraint:
- Creates a new account (fails if already exists)
- Allocates space
- Sets program as owner
- Writes discriminator

### Anchor: Manual is_initialized Check

```rust
pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
    // SECURE: Check if already initialized
    if ctx.accounts.vault.is_initialized {
        return Err(ErrorCode::AccountAlreadyInitialized.into());
    }

    ctx.accounts.vault.owner = ctx.accounts.owner.key();
    ctx.accounts.vault.balance = 0;
    ctx.accounts.vault.is_initialized = true;
    Ok(())
}
```

### Pinocchio: Discriminator Check

```rust
pub const VAULT_DISCRIMINATOR: u8 = 1;
pub const UNINITIALIZED: u8 = 0;

pub fn process_initialize(accounts: &[AccountInfo]) -> ProgramResult {
    let owner = &accounts[0];
    let vault = &accounts[1];

    let data = vault.try_borrow_data()?;

    // SECURE: Check discriminator indicates uninitialized
    if data[0] != UNINITIALIZED {
        return Err(ProgramError::AccountAlreadyInitialized);
    }

    drop(data);

    // Now safe to initialize
    let mut data = vault.try_borrow_mut_data()?;
    data[0] = VAULT_DISCRIMINATOR;  // Mark as initialized

    let vault_state = VaultState::from_bytes_mut(&mut data[1..])?;
    vault_state.owner = *owner.key();
    vault_state.balance = 0;

    Ok(())
}
```

### Pinocchio: Owner Check (System Program)

```rust
pub fn process_initialize(accounts: &[AccountInfo]) -> ProgramResult {
    let owner = &accounts[0];
    let vault = &accounts[1];

    // SECURE: Uninitialized accounts are owned by System Program
    if !vault.is_owned_by(&system_program::ID) {
        return Err(ProgramError::AccountAlreadyInitialized);
    }

    // Create and initialize the account...
    Ok(())
}
```

## Dangerous Pattern: init_if_needed

**Avoid `init_if_needed`** - it silently continues on already-initialized accounts:

```rust
// DANGEROUS: Can modify existing accounts
#[account(
    init_if_needed,  // Don't use this!
    payer = owner,
    space = 8 + Vault::INIT_SPACE,
)]
pub vault: Account<'info, Vault>,
```

If you must use it, add explicit guards:

```rust
// LESS DANGEROUS: With explicit check
#[account(
    init_if_needed,
    payer = owner,
    space = 8 + Vault::INIT_SPACE,
    constraint = !vault.is_initialized @ ErrorCode::AlreadyInitialized,
)]
pub vault: Account<'info, Vault>,
```

## Detection Checklist

When auditing, look for:

- [ ] Initialize functions without `init` constraint
- [ ] Missing `is_initialized` checks in init logic
- [ ] Use of `init_if_needed` without additional guards
- [ ] Discriminator not checked before initialization
- [ ] Mutable accounts in init that don't verify uninitialized state

## Testing for the Vulnerability

```rust
#[test]
fn test_reinitialization_attack() {
    // Setup: Create initialized vault owned by victim
    let vault = initialize_vault(victim_keypair);
    assert_eq!(vault.owner, victim_pubkey);

    // Attack: Try to reinitialize with attacker
    let result = initialize(
        attacker_keypair,
        vault,  // Already initialized!
    );

    // Should fail if protection exists
    assert!(result.is_err(), "Should reject reinitialization!");

    // Verify owner unchanged
    let vault_after = get_vault_state(vault);
    assert_eq!(vault_after.owner, victim_pubkey);
}
```

## Related Vulnerabilities

### Combined with Type Cosplay

Attacker might try to reinitialize with different account type:

```rust
// Defense: Check BOTH discriminator value AND that it's uninitialized
if data[0] != UNINITIALIZED {
    return Err(ProgramError::AccountAlreadyInitialized);
}
```

### Combined with Revival Attacks

Account could be closed then reinitialized:

```rust
// Defense: Use closed discriminator pattern
pub const CLOSED_DISCRIMINATOR: u8 = 255;

// In init: reject if was previously closed
if data[0] == CLOSED_DISCRIMINATOR {
    return Err(ErrorCode::AccountPreviouslyClosed.into());
}
```

## Key Takeaways

1. **Always use `init` constraint** in Anchor for new accounts
2. **Check discriminator** in Pinocchio before any initialization
3. **Never use `init_if_needed`** without additional safeguards
4. **Uninitialized accounts are owned by System Program** - use this for validation
5. **Consider closed accounts** - they might be targets for reinitialization
6. **PDA derivation helps** - but doesn't prevent reinitialization alone
