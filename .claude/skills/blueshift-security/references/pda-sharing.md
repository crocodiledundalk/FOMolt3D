# PDA Sharing

PDA sharing attacks occur when programs use the same Program Derived Address (PDA) across multiple users or domains. This creates dangerous cross-contamination where one user's actions can affect another user's assets.

## Severity: High

Insufficient PDA seed specificity allows attackers to access or manipulate other users' assets.

## The Vulnerability

### Core Issue

When multiple accounts share identical PDA authority, programs cannot distinguish between legitimate and illegitimate access attempts. Attackers can create their own accounts referencing the shared PDA, then exploit that PDA's signing authority to manipulate other users' assets.

### Vulnerable Pattern

```rust
// VULNERABLE: PDA derived only from mint - shared across ALL users
#[derive(Accounts)]
pub struct Withdraw<'info> {
    pub owner: Signer<'info>,
    #[account(mut)]
    pub vault: Account<'info, Vault>,
    #[account(mut)]
    pub vault_token_account: Account<'info, TokenAccount>,
    /// CHECK: PDA authority
    #[account(
        seeds = [b"pool", vault.mint.as_ref()],  // VULNERABLE!
        bump = pool.bump,
    )]
    pub pool_authority: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
}
```

### Why This Is Vulnerable

```
User A creates: Vault { mint: USDC, owner: UserA }
  → pool_authority PDA = hash("pool", USDC)

User B creates: Vault { mint: USDC, owner: UserB }
  → pool_authority PDA = hash("pool", USDC)  // SAME PDA!

Both vaults share the same pool_authority.
Whoever can invoke with this PDA can access BOTH vaults.
```

## Exploit Scenario

### Cross-User Fund Drain

```
Setup:
  - Alice's vault has 1000 USDC
  - Bob's vault has 500 USDC
  - Both use same pool_authority PDA (derived from mint only)

Attack:
1. Attacker creates their own vault for USDC mint
2. Attacker's vault references same pool_authority
3. Attacker calls withdraw with:
   - Their vault as source
   - Alice's token account as target for PDA signing
4. Pool authority PDA signs for the transfer
5. Attacker drains Alice's funds

This works because the PDA doesn't know "whose" vault it belongs to.
```

### DeFi Liquidation Exploit

```
Protocol has shared liquidation PDA for all positions.

Attacker:
1. Creates position that gets liquidated
2. Intercepts liquidation flow
3. Redirects liquidated funds using shared PDA authority
4. Drains other users' liquidated collateral
```

## Secure Implementations

### Anchor: User-Specific Seeds (Recommended)

```rust
#[derive(Accounts)]
pub struct Withdraw<'info> {
    pub owner: Signer<'info>,
    #[account(
        mut,
        has_one = owner,
        has_one = vault_token_account,
    )]
    pub vault: Account<'info, Vault>,
    #[account(mut)]
    pub vault_token_account: Account<'info, TokenAccount>,
    /// CHECK: PDA authority - now user-specific
    #[account(
        seeds = [
            b"pool",
            vault.key().as_ref(),           // Vault-specific
            owner.key().as_ref(),           // User-specific
        ],
        bump = vault.authority_bump,
    )]
    pub pool_authority: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
}

#[account]
pub struct Vault {
    pub owner: Pubkey,
    pub mint: Pubkey,
    pub vault_token_account: Pubkey,
    pub authority_bump: u8,
}
```

### Anchor: Multi-Factor Seeds

```rust
#[account(
    seeds = [
        b"vault_authority",
        vault.key().as_ref(),
        withdraw_destination.key().as_ref(),
    ],
    bump = vault.authority_bump,
)]
pub vault_authority: UncheckedAccount<'info>,
```

Store destination in vault and validate with `has_one`:

```rust
#[account]
pub struct Vault {
    pub owner: Pubkey,
    pub vault_token_account: Pubkey,
    pub withdraw_destination: Pubkey,  // Fixed destination
    pub authority_bump: u8,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(
        has_one = owner,
        has_one = withdraw_destination,  // Validates relationship
    )]
    pub vault: Account<'info, Vault>,
    // ...
}
```

### Pinocchio: Specific PDA Derivation

```rust
pub fn derive_vault_authority(
    vault: &Pubkey,
    owner: &Pubkey,
    program_id: &Pubkey,
) -> (Pubkey, u8) {
    // SECURE: User and vault specific
    find_program_address(
        &[
            b"vault_authority",
            vault.as_ref(),
            owner.as_ref(),
        ],
        program_id,
    )
}

pub fn process_withdraw(accounts: &[AccountInfo]) -> ProgramResult {
    let owner = &accounts[0];
    let vault = &accounts[1];
    let vault_authority = &accounts[2];

    // Validate PDA matches expected derivation
    let (expected_authority, bump) = derive_vault_authority(
        vault.key(),
        owner.key(),
        &crate::ID,
    );

    if !vault_authority.key().eq(&expected_authority) {
        return Err(ProgramError::InvalidSeeds);
    }

    // Now safe to use PDA for signing
    // ...
}
```

### Pinocchio: Stored Seed Validation

```rust
pub fn process_withdraw(accounts: &[AccountInfo]) -> ProgramResult {
    let owner = &accounts[0];
    let vault = &accounts[1];
    let vault_authority = &accounts[2];
    let destination = &accounts[3];

    // Load vault state
    let vault_data = vault.try_borrow_data()?;
    let vault_state = VaultState::from_bytes(&vault_data)?;

    // Validate owner
    if !vault_state.owner.eq(owner.key()) {
        return Err(ProgramError::InvalidAccountData);
    }

    // Validate destination matches stored value
    if !vault_state.withdraw_destination.eq(destination.key()) {
        return Err(ProgramError::InvalidAccountData);
    }

    // Derive PDA with all specific seeds
    let (expected_authority, bump) = find_program_address(
        &[
            b"vault_authority",
            vault.key().as_ref(),
            destination.key().as_ref(),
        ],
        &crate::ID,
    );

    if !vault_authority.key().eq(&expected_authority) {
        return Err(ProgramError::InvalidSeeds);
    }

    // Safe to proceed
    // ...
}
```

## Seed Specificity Patterns

### Bad: Global/Mint-Only Seeds

```rust
// DANGEROUS: Same PDA for all users of this mint
seeds = [b"pool", mint.as_ref()]
```

### Better: User-Specific Seeds

```rust
// SAFER: Different PDA per user
seeds = [b"pool", mint.as_ref(), user.as_ref()]
```

### Best: Account-Specific Seeds

```rust
// SAFEST: Different PDA per account instance
seeds = [b"pool", vault.key().as_ref(), user.as_ref()]
```

### With Destination Binding

```rust
// MOST RESTRICTIVE: PDA tied to specific flow
seeds = [b"authority", source.as_ref(), destination.as_ref()]
```

## Detection Checklist

When auditing, look for:

- [ ] PDA seeds that don't include user/owner key
- [ ] Same PDA used across multiple user accounts
- [ ] Authority PDAs derived from shared data (mint only)
- [ ] Missing `has_one` constraints for PDA-related fields
- [ ] Token accounts not bound to specific authority PDAs

## Testing for the Vulnerability

```rust
#[test]
fn test_pda_sharing_attack() {
    // Setup: Two users with vaults for same mint
    let alice_vault = create_vault(alice, usdc_mint);
    let bob_vault = create_vault(bob, usdc_mint);

    // Fund Alice's vault
    deposit(alice, alice_vault, 1000);

    // Attack: Bob tries to withdraw from Alice's vault
    let result = withdraw(
        bob,
        alice_vault.token_account,  // Alice's tokens
        bob_destination,            // Bob's destination
    );

    // Should fail if PDAs are properly separated
    assert!(result.is_err(), "Should not allow cross-user access!");
}

#[test]
fn test_pda_uniqueness() {
    let alice_vault = create_vault(alice, usdc_mint);
    let bob_vault = create_vault(bob, usdc_mint);

    // PDAs should be different
    let alice_authority = derive_authority(alice_vault);
    let bob_authority = derive_authority(bob_vault);

    assert_ne!(
        alice_authority,
        bob_authority,
        "Each user should have unique PDA!"
    );
}
```

## Real-World Impact Examples

### Shared Pool Authority

```
Protocol uses: seeds = [b"pool", pool_id]

All users' positions share same pool authority.
Attacker creates malicious position → signs for all positions.
```

### Shared Escrow Authority

```
Protocol uses: seeds = [b"escrow", token_mint]

All escrows for same token share authority.
Attacker can redirect any escrow settlement.
```

## Key Takeaways

1. **PDA seeds must include user-specific data** (user key, vault key)
2. **Mint/pool alone is not enough** - creates shared authority
3. **Store related keys in account state** and validate with `has_one`
4. **Each user should have unique PDA** for their resources
5. **Think about what PDA can sign for** - limit its scope
6. **Test cross-user scenarios** explicitly in security tests
