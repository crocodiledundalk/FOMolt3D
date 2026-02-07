# Account Reloading

Account reloading is a vulnerability that arises when developers fail to update deserialized accounts after performing a CPI. The program operates on stale data, leading to logical errors or incorrect calculations.

## Severity: Medium-High

Stale data after CPI can lead to incorrect state calculations, double-counting, or bypassed checks.

## The Vulnerability

### Core Issue

When you deserialize an account at the start of an instruction, you get a snapshot of its state. If a CPI modifies that account, your deserialized copy is now **stale** - it doesn't reflect the changes made by the CPI.

Anchor does **not** automatically refresh deserialized accounts after a CPI.

### Vulnerable Pattern (Anchor)

```rust
#[derive(Accounts)]
pub struct DepositAndStake<'info> {
    pub user: Signer<'info>,
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub vault_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub stake_account: Account<'info, StakeAccount>,
    pub token_program: Program<'info, Token>,
}

pub fn deposit_and_stake(ctx: Context<DepositAndStake>, amount: u64) -> Result<()> {
    // Step 1: Get balance BEFORE transfer
    let balance_before = ctx.accounts.vault_token_account.amount;

    // Step 2: Transfer tokens via CPI
    let cpi_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.user_token_account.to_account_info(),
            to: ctx.accounts.vault_token_account.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        },
    );
    transfer(cpi_ctx, amount)?;

    // VULNERABLE: vault_token_account.amount is STALE!
    // It still shows the balance BEFORE the transfer
    let balance_after = ctx.accounts.vault_token_account.amount;

    // This will be 0, not `amount`!
    let deposited = balance_after - balance_before;

    // Stake account gets credited with 0 instead of `amount`
    ctx.accounts.stake_account.staked_amount += deposited;

    Ok(())
}
```

### Vulnerable Pattern (Pinocchio)

```rust
pub fn process_deposit_and_stake(accounts: &[AccountInfo], amount: u64) -> ProgramResult {
    let user = &accounts[0];
    let user_token = &accounts[1];
    let vault_token = &accounts[2];
    let stake_account = &accounts[3];

    // Deserialize vault state BEFORE CPI
    let vault_data = vault_token.try_borrow_data()?;
    let vault_state_before = TokenAccount::from_bytes(&vault_data)?;
    let balance_before = vault_state_before.amount;
    drop(vault_data);

    // Perform transfer CPI
    transfer_tokens(user_token, vault_token, user, amount)?;

    // VULNERABLE: Re-reading the same deserialized data
    // The CPI modified the account, but we're using cached data
    let vault_data = vault_token.try_borrow_data()?;
    let vault_state_after = TokenAccount::from_bytes(&vault_data)?;

    // Actually this WILL work in Pinocchio since we re-borrow
    // But if we had cached the struct, it would be stale

    Ok(())
}
```

## Exploit Scenario

### Incorrect Balance Tracking

```
Initial state:
  - vault_token_account.amount = 1000
  - User deposits 500

Expected:
  - vault_token_account.amount = 1500
  - stake_account.staked_amount += 500

Actual (with bug):
  - vault_token_account.amount = 1500 (correct on-chain)
  - stake_account.staked_amount += 0 (WRONG! Used stale data)

User deposits 500 tokens but gets 0 staking credit.
```

### Double Counting Attack

```rust
// Vulnerable pattern that could allow double counting
let balance = ctx.accounts.vault.amount;  // Cache balance

// CPI that REMOVES tokens
withdraw_cpi(...)?;

// Still using old balance that includes withdrawn tokens
let rewards = calculate_rewards(balance);  // Overpays!
```

## Secure Implementations

### Anchor: Using reload() (Recommended)

```rust
pub fn deposit_and_stake(ctx: Context<DepositAndStake>, amount: u64) -> Result<()> {
    let balance_before = ctx.accounts.vault_token_account.amount;

    // Transfer via CPI
    let cpi_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.user_token_account.to_account_info(),
            to: ctx.accounts.vault_token_account.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        },
    );
    transfer(cpi_ctx, amount)?;

    // SECURE: Reload the account to get fresh data
    ctx.accounts.vault_token_account.reload()?;

    let balance_after = ctx.accounts.vault_token_account.amount;
    let deposited = balance_after - balance_before;

    ctx.accounts.stake_account.staked_amount += deposited;

    Ok(())
}
```

### Anchor: Re-fetch Account Info

```rust
pub fn deposit_and_stake(ctx: Context<DepositAndStake>, amount: u64) -> Result<()> {
    // ... perform CPI ...

    // SECURE: Re-deserialize from account info
    let vault_info = ctx.accounts.vault_token_account.to_account_info();
    let vault_data = vault_info.try_borrow_data()?;
    let fresh_vault = TokenAccount::try_deserialize(&mut &vault_data[..])?;

    let balance_after = fresh_vault.amount;
    // ...
}
```

### Pinocchio: Always Re-borrow After CPI

```rust
pub fn process_deposit_and_stake(accounts: &[AccountInfo], amount: u64) -> ProgramResult {
    let vault_token = &accounts[2];

    // Get balance before (borrow and drop)
    let balance_before = {
        let data = vault_token.try_borrow_data()?;
        let state = TokenAccount::from_bytes(&data)?;
        state.amount
    };  // Borrow dropped here

    // Perform CPI
    transfer_tokens(...)?;

    // SECURE: Fresh borrow after CPI
    let balance_after = {
        let data = vault_token.try_borrow_data()?;
        let state = TokenAccount::from_bytes(&data)?;
        state.amount
    };

    let deposited = balance_after.checked_sub(balance_before)
        .ok_or(ProgramError::ArithmeticOverflow)?;

    // ...
}
```

### Alternative: Use Expected Amount

```rust
pub fn deposit_and_stake(ctx: Context<DepositAndStake>, amount: u64) -> Result<()> {
    // Transfer via CPI
    transfer(cpi_ctx, amount)?;

    // SECURE: Trust the amount we sent, don't re-read
    // (Only works when you control the exact amount)
    ctx.accounts.stake_account.staked_amount += amount;

    Ok(())
}
```

## When Reloading Is Required

Reload accounts after CPI when:
- [ ] You need to read account state that was modified by the CPI
- [ ] You're calculating deltas (before/after comparisons)
- [ ] You're making decisions based on post-CPI state
- [ ] Multiple CPIs modify the same account

## When Reloading Is NOT Required

Skip reloading when:
- Account was not modified by the CPI
- You're only writing to the account (not reading post-CPI)
- You trust the amount parameter rather than reading balance

## Detection Checklist

When auditing, look for:

- [ ] Account state read after CPI without `reload()`
- [ ] Balance calculations using pre-CPI deserialized accounts
- [ ] Before/after comparisons spanning a CPI
- [ ] Reward calculations after transfer CPIs
- [ ] Any logic depending on state modified by CPI

## Testing for the Vulnerability

```rust
#[test]
fn test_stale_account_after_cpi() {
    let vault_before = get_token_balance(vault);
    assert_eq!(vault_before, 1000);

    // Deposit 500 tokens
    deposit_and_stake(user, vault, 500);

    // Check vault balance (on-chain)
    let vault_after = get_token_balance(vault);
    assert_eq!(vault_after, 1500);

    // Check stake account got credited correctly
    let stake = get_stake_account(user);
    assert_eq!(stake.staked_amount, 500, "Should credit full deposit!");
}
```

## Key Takeaways

1. **Anchor doesn't auto-refresh** accounts after CPI
2. **Always call `reload()`** when you need post-CPI state
3. **Pinocchio requires re-borrowing** data after CPI
4. **Consider using expected amounts** instead of reading when possible
5. **Be especially careful** with balance delta calculations
6. **Test with assertions** on post-CPI values

## Sources

- [Helius - A Hitchhiker's Guide to Solana Program Security](https://www.helius.dev/blog/a-hitchhikers-guide-to-solana-program-security)
- [Ackee Blockchain - Solana Common Attack Vectors](https://github.com/Ackee-Blockchain/solana-common-attack-vectors)
