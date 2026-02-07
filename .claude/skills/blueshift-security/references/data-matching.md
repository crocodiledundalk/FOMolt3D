# Data Matching

Data matching validates that account data contains expected values and relationships before program logic trusts it. While owner and signer checks verify control and authorization, data matching ensures internal account state aligns with program assumptions.

## Severity: High

Missing data matching allows attackers to bypass authorization by exploiting unvalidated account relationships.

## The Vulnerability

### Core Issue

Programs often fail to validate relationships between different account data pieces. A program might correctly verify account type and ownership but make incorrect assumptions about data correlations.

### Vulnerable Pattern (Anchor)

```rust
#[derive(Accounts)]
pub struct UpdateOwner<'info> {
    pub owner: Signer<'info>,  // Signer check ✓
    #[account(mut)]
    pub vault: Account<'info, Vault>,  // Owner check ✓
    // VULNERABLE: No validation that signer IS the vault's owner
}

pub fn update_owner(ctx: Context<UpdateOwner>, new_owner: Pubkey) -> Result<()> {
    // VULNERABLE: Assumes signer is the vault owner
    ctx.accounts.vault.owner = new_owner;
    Ok(())
}
```

### Vulnerable Pattern (Pinocchio)

```rust
pub fn process_update_owner(accounts: &[AccountInfo], new_owner: Pubkey) -> ProgramResult {
    let signer = &accounts[0];
    let vault = &accounts[1];

    // Signer check ✓
    if !signer.is_signer() {
        return Err(ProgramError::MissingRequiredSignature);
    }

    // Owner check ✓
    if !vault.is_owned_by(&crate::ID) {
        return Err(ProgramError::IllegalOwner);
    }

    // VULNERABLE: No check that signer == vault.owner
    let mut data = vault.try_borrow_mut_data()?;
    let vault_state = VaultState::from_bytes_mut(&mut data)?;
    vault_state.owner = new_owner;

    Ok(())
}
```

## Exploit Scenario

```
Victim's vault: Vault { owner: Alice, balance: 10000 }
Attacker creates their own keypair and signs

Attack transaction:
  - signer: Attacker (valid signature)
  - vault: Victim's vault account
  - new_owner: Attacker

Result:
  - Signer check passes (attacker signed)
  - Owner check passes (vault owned by program)
  - No data match check!
  - Vault now owned by attacker: Vault { owner: Attacker, balance: 10000 }
```

## Secure Implementations

### Anchor: Using has_one Constraint (Recommended)

```rust
#[derive(Accounts)]
pub struct UpdateOwner<'info> {
    pub owner: Signer<'info>,
    // SECURE: has_one validates vault.owner == owner.key()
    #[account(mut, has_one = owner)]
    pub vault: Account<'info, Vault>,
}

#[account]
pub struct Vault {
    pub owner: Pubkey,  // Field name must match constraint
    pub balance: u64,
}
```

### Anchor: Using constraint Expression

```rust
#[derive(Accounts)]
pub struct UpdateOwner<'info> {
    pub authority: Signer<'info>,
    // SECURE: Custom constraint expression
    #[account(
        mut,
        constraint = vault.owner == authority.key() @ ErrorCode::InvalidAuthority
    )]
    pub vault: Account<'info, Vault>,
}
```

### Anchor: PDA Derivation (Strongest)

Derive the vault as a PDA from the owner's key:

```rust
#[derive(Accounts)]
pub struct UpdateOwner<'info> {
    pub owner: Signer<'info>,
    // SECURE: PDA ensures vault is unique to this owner
    #[account(
        mut,
        seeds = [b"vault", owner.key().as_ref()],
        bump = vault.bump,
    )]
    pub vault: Account<'info, Vault>,
}
```

### Anchor: Manual Runtime Check

```rust
pub fn update_owner(ctx: Context<UpdateOwner>, new_owner: Pubkey) -> Result<()> {
    // SECURE: Explicit validation in instruction logic
    if ctx.accounts.vault.owner != ctx.accounts.owner.key() {
        return Err(ErrorCode::InvalidAuthority.into());
    }

    ctx.accounts.vault.owner = new_owner;
    Ok(())
}
```

### Pinocchio: Manual Validation

```rust
pub fn process_update_owner(accounts: &[AccountInfo], new_owner: Pubkey) -> ProgramResult {
    let signer = &accounts[0];
    let vault = &accounts[1];

    // Signer check
    if !signer.is_signer() {
        return Err(ProgramError::MissingRequiredSignature);
    }

    // Owner check
    if !vault.is_owned_by(&crate::ID) {
        return Err(ProgramError::IllegalOwner);
    }

    // SECURE: Data matching - verify relationship
    let data = vault.try_borrow_data()?;
    let vault_state = VaultState::from_bytes(&data)?;

    if !vault_state.owner.eq(signer.key()) {
        return Err(ProgramError::InvalidAccountData);
    }

    // Now safe to proceed
    let mut data = vault.try_borrow_mut_data()?;
    let vault_state = VaultState::from_bytes_mut(&mut data)?;
    vault_state.owner = new_owner;

    Ok(())
}
```

### Pinocchio: TryFrom with Validation

```rust
impl<'a> TryFrom<(&'a [AccountInfo], &Pubkey)> for UpdateAccounts<'a> {
    type Error = ProgramError;

    fn try_from((accounts, expected_owner): (&'a [AccountInfo], &Pubkey)) -> Result<Self, Self::Error> {
        let [signer, vault, ..] = accounts else {
            return Err(ProgramError::NotEnoughAccountKeys);
        };

        if !signer.is_signer() {
            return Err(ProgramError::MissingRequiredSignature);
        }

        if !vault.is_owned_by(&crate::ID) {
            return Err(ProgramError::IllegalOwner);
        }

        // SECURE: Validate data relationship
        let data = vault.try_borrow_data()?;
        let vault_state = VaultState::from_bytes(&data)?;

        if !vault_state.owner.eq(expected_owner) {
            return Err(ProgramError::InvalidAccountData);
        }

        Ok(Self { signer, vault })
    }
}
```

## Common Patterns Requiring Data Matching

### 1. Authority Validation

```rust
// Vault.authority must equal signer
#[account(has_one = authority)]
pub vault: Account<'info, Vault>,
```

### 2. Mint Validation

```rust
// Token account must be for the correct mint
#[account(
    token::mint = expected_mint,
    token::authority = owner,
)]
pub token_account: Account<'info, TokenAccount>,
```

### 3. Related Account Validation

```rust
// Position must belong to this pool
#[account(has_one = pool)]
pub position: Account<'info, Position>,
pub pool: Account<'info, Pool>,
```

### 4. Multi-field Validation

```rust
#[account(
    has_one = owner,
    has_one = mint,
    constraint = vault.is_active @ ErrorCode::VaultInactive
)]
pub vault: Account<'info, Vault>,
```

## Detection Checklist

When auditing, look for:

- [ ] Signer used for authorization without `has_one` constraint
- [ ] Multiple related accounts without relationship validation
- [ ] Assumptions about account data without explicit checks
- [ ] Token accounts without mint validation
- [ ] Authority accounts without ownership proof

## Testing for the Vulnerability

```rust
#[test]
fn test_missing_data_match() {
    // Setup: Create victim's vault
    let victim_vault = create_vault(victim_owner);

    // Attack: Try to update with attacker as signer
    let result = update_owner(
        attacker_keypair,     // Attacker signs
        victim_vault,         // Victim's vault (not attacker's)
        attacker_pubkey,      // New owner = attacker
    );

    // Should fail if data matching is implemented
    assert!(result.is_err(), "Should validate owner relationship!");
}
```

## Key Takeaways

1. **Signer ≠ Owner** - Just because someone signed doesn't mean they own the account
2. **Use `has_one`** in Anchor for relationship validation
3. **PDA derivation** provides strongest guarantees (account is mathematically tied to user)
4. **Always verify before mutating** - Check relationships before changing state
5. **Think adversarially** - What if attacker controls the signer but passes someone else's account?
