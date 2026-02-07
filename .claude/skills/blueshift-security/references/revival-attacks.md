# Revival Attacks

Revival attacks exploit Solana's account closure mechanism by resurrecting "dead" accounts within the same transaction. When you close an account by transferring out its lamports, Solana doesn't immediately garbage collect it - the account only gets cleaned up after the transaction completes.

## Severity: High

This creates a dangerous window where attackers can send lamports back to closed accounts, creating zombie accounts with stale data.

## The Vulnerability

### Core Issue

Developers assume closing an account immediately renders it unusable. However:
1. Accounts remain accessible until transaction completion
2. Transferring lamports back prevents garbage collection
3. "Revived" accounts retain their original data

### Vulnerable Pattern (Anchor)

```rust
#[derive(Accounts)]
pub struct CloseAccount<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(mut)]
    pub vault: Account<'info, Vault>,
    /// CHECK: Receives lamports
    #[account(mut)]
    pub destination: UncheckedAccount<'info>,
}

pub fn close_account(ctx: Context<CloseAccount>) -> Result<()> {
    // VULNERABLE: Only transfers lamports, doesn't clear data
    let vault = &ctx.accounts.vault;
    let destination = &ctx.accounts.destination;

    **destination.lamports.borrow_mut() += vault.to_account_info().lamports();
    **vault.to_account_info().lamports.borrow_mut() = 0;

    Ok(())
}
```

### Vulnerable Pattern (Pinocchio)

```rust
pub fn process_close(accounts: &[AccountInfo]) -> ProgramResult {
    let authority = &accounts[0];
    let vault = &accounts[1];
    let destination = &accounts[2];

    // VULNERABLE: Lamports transferred but data intact
    let vault_lamports = vault.lamports();

    **vault.try_borrow_mut_lamports()? = 0;
    **destination.try_borrow_mut_lamports()? += vault_lamports;

    Ok(())
}
```

## Exploit Scenario

### Single Transaction Attack

```
Transaction with 3 instructions:

1. close_account(vault)
   → vault.lamports = 0
   → destination.lamports += vault_balance
   → vault data still exists!

2. system_transfer(attacker → vault, 1 lamport)
   → vault.lamports = 1
   → Account is "revived"!

3. withdraw_from_vault(vault)
   → Vault still has original data
   → Attacker can use "closed" vault
```

### Double-Spend with Escrow

```
1. Create escrow with 1000 tokens
2. Close escrow (receive tokens back)
3. Revive escrow with 1 lamport transfer
4. Close escrow again (receive tokens again!)
```

## Secure Implementations

### Anchor: Using close Constraint (Recommended)

```rust
#[derive(Accounts)]
pub struct CloseAccount<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    // SECURE: close constraint handles everything
    #[account(
        mut,
        close = destination,
        has_one = authority,
    )]
    pub vault: Account<'info, Vault>,
    /// CHECK: Receives lamports
    #[account(mut)]
    pub destination: UncheckedAccount<'info>,
}
```

The `close` constraint:
- Transfers all lamports to destination
- Zeros all account data
- Changes owner to System Program
- Writes closed discriminator

### Anchor: Manual Secure Close

```rust
pub fn close_account(ctx: Context<CloseAccount>) -> Result<()> {
    let vault_info = ctx.accounts.vault.to_account_info();
    let destination = &ctx.accounts.destination;

    // 1. Transfer lamports
    let vault_lamports = vault_info.lamports();
    **vault_info.lamports.borrow_mut() = 0;
    **destination.lamports.borrow_mut() += vault_lamports;

    // 2. Zero account data (CRITICAL!)
    let mut data = vault_info.data.borrow_mut();
    data.fill(0);

    // 3. Optionally write closed discriminator
    // data[0..8].copy_from_slice(&CLOSED_DISCRIMINATOR);

    Ok(())
}
```

### Pinocchio: Complete Closure

```rust
pub const CLOSED_DISCRIMINATOR: u8 = 255;

pub fn process_close(accounts: &[AccountInfo]) -> ProgramResult {
    let authority = &accounts[0];
    let vault = &accounts[1];
    let destination = &accounts[2];

    // Validate authority
    if !authority.is_signer() {
        return Err(ProgramError::MissingRequiredSignature);
    }

    // 1. Transfer all lamports
    let vault_lamports = vault.lamports();
    **vault.try_borrow_mut_lamports()? = 0;
    **destination.try_borrow_mut_lamports()? += vault_lamports;

    // 2. Zero all account data (CRITICAL!)
    let mut data = vault.try_borrow_mut_data()?;
    data.fill(0);

    // 3. Write closed discriminator to prevent reuse
    data[0] = CLOSED_DISCRIMINATOR;

    // 4. Optionally reassign to System Program
    vault.assign(&system_program::ID);

    Ok(())
}
```

### Pinocchio: Reallocation to Zero

```rust
pub fn process_close(accounts: &[AccountInfo]) -> ProgramResult {
    let vault = &accounts[1];
    let destination = &accounts[2];

    // Transfer lamports
    let vault_lamports = vault.lamports();
    **vault.try_borrow_mut_lamports()? = 0;
    **destination.try_borrow_mut_lamports()? += vault_lamports;

    // Reallocate to 0 bytes
    vault.realloc(0, false)?;

    // Assign to System Program
    vault.assign(&system_program::ID);

    Ok(())
}
```

## Prevention Checklist

### When Closing Accounts

1. **Transfer all lamports** to destination
2. **Zero all account data** - `data.fill(0)`
3. **Write closed discriminator** - prevents reinitialization
4. **Reassign to System Program** - marks as truly closed

### In Other Instructions

Check for closed accounts before use:

```rust
// Pinocchio
if data[0] == CLOSED_DISCRIMINATOR {
    return Err(ProgramError::InvalidAccountData);
}

// Or check lamports
if vault.lamports() == 0 {
    return Err(ErrorCode::AccountClosed.into());
}
```

## Detection Checklist

When auditing, look for:

- [ ] Close functions that only transfer lamports
- [ ] Missing data zeroing in close logic
- [ ] No closed discriminator written
- [ ] Instructions that don't check for closed state
- [ ] `close` constraint not used in Anchor

## Testing for the Vulnerability

```rust
#[test]
fn test_revival_attack() {
    // Setup: Create and fund vault
    let vault = create_vault(1_000_000);

    // Step 1: Close the vault
    close_account(vault, destination);
    assert_eq!(vault.lamports(), 0);

    // Step 2: Revive with lamport transfer
    system_transfer(attacker, vault, 1);
    assert_eq!(vault.lamports(), 1);

    // Step 3: Try to use revived vault
    let result = withdraw(vault);

    // Should fail if properly protected
    assert!(result.is_err(), "Should reject revived account!");
}

#[test]
fn test_data_zeroed_on_close() {
    let vault = create_vault(1_000_000);
    vault.balance = 500_000;

    close_account(vault, destination);

    // Even if revived, data should be zeroed
    system_transfer(attacker, vault, 1);

    let data = vault.data();
    assert!(data.iter().all(|&b| b == 0 || b == CLOSED_DISCRIMINATOR));
}
```

## Related Patterns

### Closed Account Discriminator

```rust
pub const ACCOUNT_DISCRIMINATOR: u8 = 1;
pub const CLOSED_DISCRIMINATOR: u8 = 255;

// In all instructions, check not closed
if data[0] == CLOSED_DISCRIMINATOR {
    return Err(ErrorCode::AccountClosed.into());
}
```

### Lamports Check

```rust
// Additional safety: closed accounts should have 0 lamports
if account.lamports() == 0 {
    return Err(ErrorCode::AccountClosed.into());
}
```

## Key Takeaways

1. **Closing ≠ Deletion** - Accounts exist until transaction ends
2. **Always zero data** when closing accounts
3. **Use Anchor's `close` constraint** when possible
4. **Write closed discriminator** to prevent reinitialization
5. **Check closed state** in all instructions that read accounts
6. **Revival happens in same transaction** - can't prevent cross-instruction
