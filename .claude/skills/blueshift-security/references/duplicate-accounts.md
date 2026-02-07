# Duplicate Mutable Accounts

Duplicate mutable accounts attacks occur when programs accept multiple mutable accounts of the same type but fail to verify they're distinct. An attacker can pass the same account twice, causing the program to overwrite its initial mutations with subsequent ones.

## Severity: High

This creates a race condition within a single instruction where later mutations can silently cancel out earlier ones.

## The Vulnerability

### Core Issue

When identical accounts are passed to different parameters:
1. Program performs the first mutation
2. Same account reference causes second mutation to overwrite the first
3. Account ends in unexpected state

This primarily affects instructions that modify data in program-owned accounts, not system operations like lamport transfers.

### Vulnerable Pattern (Anchor)

```rust
#[derive(Accounts)]
pub struct SwapAccounts<'info> {
    pub authority: Signer<'info>,
    #[account(mut)]
    pub account_a: Account<'info, UserAccount>,
    #[account(mut)]
    pub account_b: Account<'info, UserAccount>,
}

pub fn swap_values(ctx: Context<SwapAccounts>) -> Result<()> {
    // VULNERABLE: No check that accounts are different
    let temp = ctx.accounts.account_a.value;
    ctx.accounts.account_a.value = ctx.accounts.account_b.value;
    ctx.accounts.account_b.value = temp;
    Ok(())
}
```

### Vulnerable Pattern (Pinocchio)

```rust
pub fn process_swap(accounts: &[AccountInfo]) -> ProgramResult {
    let account_a = &accounts[0];
    let account_b = &accounts[1];

    // VULNERABLE: No uniqueness check
    let mut data_a = account_a.try_borrow_mut_data()?;
    let mut data_b = account_b.try_borrow_mut_data()?;

    // Swap values
    let state_a = UserAccount::from_bytes_mut(&mut data_a)?;
    let state_b = UserAccount::from_bytes_mut(&mut data_b)?;

    let temp = state_a.value;
    state_a.value = state_b.value;
    state_b.value = temp;

    Ok(())
}
```

## Exploit Scenario

### Example: Double Reward Claim

```rust
pub fn claim_rewards(ctx: Context<ClaimRewards>) -> Result<()> {
    // VULNERABLE: Same account can be passed twice
    ctx.accounts.reward_account_1.claimed = true;
    ctx.accounts.reward_account_1.balance += 100;

    ctx.accounts.reward_account_2.claimed = true;
    ctx.accounts.reward_account_2.balance += 100;

    Ok(())
}
```

**Attack:**
```
Attacker passes same account for both reward_account_1 and reward_account_2
Result: Account marked claimed, but receives 200 instead of 100
```

### Example: Value Overwrite

```rust
pub fn update_accounts(
    ctx: Context<UpdateAccounts>,
    value_a: u64,
    value_b: u64,
) -> Result<()> {
    ctx.accounts.account_1.value = value_a;  // Sets to value_a
    ctx.accounts.account_2.value = value_b;  // Overwrites with value_b!
    Ok(())
}
```

**Attack:**
```
Pass same account for account_1 and account_2
With value_a = 1000, value_b = 0
Result: Account value = 0 (value_a is lost)
```

## Secure Implementations

### Anchor: Manual Check (Recommended)

```rust
pub fn swap_values(ctx: Context<SwapAccounts>) -> Result<()> {
    // SECURE: Verify accounts are different
    if ctx.accounts.account_a.key() == ctx.accounts.account_b.key() {
        return Err(ErrorCode::DuplicateAccounts.into());
    }

    let temp = ctx.accounts.account_a.value;
    ctx.accounts.account_a.value = ctx.accounts.account_b.value;
    ctx.accounts.account_b.value = temp;
    Ok(())
}
```

### Anchor: Constraint Expression

```rust
#[derive(Accounts)]
pub struct SwapAccounts<'info> {
    pub authority: Signer<'info>,
    #[account(mut)]
    pub account_a: Account<'info, UserAccount>,
    #[account(
        mut,
        constraint = account_a.key() != account_b.key() @ ErrorCode::DuplicateAccounts
    )]
    pub account_b: Account<'info, UserAccount>,
}
```

### Pinocchio: Manual Validation

```rust
use pinocchio::pubkey::pubkey_eq;

pub fn process_swap(accounts: &[AccountInfo]) -> ProgramResult {
    let account_a = &accounts[0];
    let account_b = &accounts[1];

    // SECURE: Verify accounts are different
    if pubkey_eq(account_a.key(), account_b.key()) {
        return Err(ProgramError::InvalidArgument);
    }

    // Now safe to proceed with mutations
    let mut data_a = account_a.try_borrow_mut_data()?;
    let mut data_b = account_b.try_borrow_mut_data()?;

    let state_a = UserAccount::from_bytes_mut(&mut data_a)?;
    let state_b = UserAccount::from_bytes_mut(&mut data_b)?;

    let temp = state_a.value;
    state_a.value = state_b.value;
    state_b.value = temp;

    Ok(())
}
```

### Pinocchio: TryFrom Pattern

```rust
impl<'a> TryFrom<&'a [AccountInfo]> for SwapAccounts<'a> {
    type Error = ProgramError;

    fn try_from(accounts: &'a [AccountInfo]) -> Result<Self, Self::Error> {
        let [authority, account_a, account_b, ..] = accounts else {
            return Err(ProgramError::NotEnoughAccountKeys);
        };

        // SECURE: Check uniqueness during parsing
        if pubkey_eq(account_a.key(), account_b.key()) {
            return Err(ProgramError::InvalidArgument);
        }

        Ok(Self { authority, account_a, account_b })
    }
}
```

## Common Patterns Requiring Duplicate Checks

### 1. Multi-Account Updates

```rust
// Any instruction updating multiple accounts of same type
pub fn batch_update(
    account_1: &AccountInfo,
    account_2: &AccountInfo,
    account_3: &AccountInfo,
) {
    // Must verify all three are unique
}
```

### 2. Token Transfers Between User Accounts

```rust
pub fn transfer_between_accounts(
    source: &TokenAccount,
    destination: &TokenAccount,
) {
    // Must verify source != destination
}
```

### 3. Reward Distribution

```rust
pub fn distribute_rewards(
    recipient_1: &AccountInfo,
    recipient_2: &AccountInfo,
) {
    // Must verify recipients are different
}
```

### 4. Multi-Party Operations

```rust
pub fn settle_trade(
    party_a_account: &AccountInfo,
    party_b_account: &AccountInfo,
) {
    // Must verify parties are different
}
```

## Helper Function

```rust
// Pinocchio helper for checking multiple accounts
pub fn verify_unique_accounts(accounts: &[&AccountInfo]) -> ProgramResult {
    for i in 0..accounts.len() {
        for j in (i + 1)..accounts.len() {
            if pubkey_eq(accounts[i].key(), accounts[j].key()) {
                return Err(ProgramError::InvalidArgument);
            }
        }
    }
    Ok(())
}

// Usage
verify_unique_accounts(&[account_a, account_b, account_c])?;
```

## Detection Checklist

When auditing, look for:

- [ ] Multiple mutable accounts of the same type in instruction
- [ ] Sequential mutations to different account parameters
- [ ] Reward/distribution logic with multiple recipients
- [ ] Swap or exchange functions with two accounts
- [ ] Any instruction where duplicate would cause unexpected behavior

## Testing for the Vulnerability

```rust
#[test]
fn test_duplicate_account_attack() {
    let account = create_user_account(100);

    // Pass same account for both parameters
    let result = swap_values(
        &account,  // account_a
        &account,  // account_b (same!)
    );

    // Should fail if protection is implemented
    assert!(result.is_err(), "Should reject duplicate accounts!");
}

#[test]
fn test_duplicate_reward_claim() {
    let account = create_reward_account();

    // Try to claim twice with same account
    let result = claim_rewards(
        &account,  // reward_1
        &account,  // reward_2 (same!)
    );

    // Should only receive one reward's worth
    assert!(result.is_err() || account.balance <= 100);
}
```

## Key Takeaways

1. **Always check uniqueness** when accepting multiple mutable accounts of the same type
2. **Order matters** - later mutations overwrite earlier ones on same account
3. **Use `key() !=` comparison** or `pubkey_eq()` for validation
4. **Check early** - validate in account parsing before any mutations
5. **Consider all pairs** - with 3+ accounts, check all combinations
