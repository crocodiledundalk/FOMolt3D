# Arithmetic Vulnerabilities

Arithmetic vulnerabilities encompass integer overflow/underflow, precision loss, division by zero, and unsafe type casting. These issues can lead to incorrect token calculations, fund drainage, or program crashes.

## Severity: High

Arithmetic errors in financial calculations can result in minting excess tokens, draining pools, or enabling arbitrage attacks.

## The Vulnerabilities

### 1. Integer Overflow/Underflow

Rust release builds default to wrapping arithmetic, meaning operations silently wrap around instead of panicking.

```rust
// VULNERABLE: Using basic operators in release mode
pub fn transfer(ctx: Context<Transfer>, amount: u64) -> Result<()> {
    // If balance is 100 and amount is 200, this wraps to a huge number!
    ctx.accounts.source.balance -= amount;  // Underflow!
    ctx.accounts.dest.balance += amount;    // Potential overflow!
    Ok(())
}
```

### 2. Precision Loss

Dividing before multiplying causes precision loss that attackers can exploit for arbitrage.

```rust
// VULNERABLE: Division before multiplication
pub fn calculate_fee(amount: u64, fee_bps: u64) -> u64 {
    // If amount=99, fee_bps=100: (99 / 10000) * 100 = 0 * 100 = 0
    (amount / 10000) * fee_bps  // Fee is 0 due to truncation!
}

// VULNERABLE: Using round instead of floor
let tokens = decimal_amount.try_round_u64()?;  // Can be exploited for extra tokens
```

### 3. Division by Zero

Division by zero causes a panic, crashing the program.

```rust
// VULNERABLE: No check for zero divisor
pub fn calculate_share(total: u64, supply: u64) -> u64 {
    total / supply  // Panics if supply is 0!
}
```

### 4. Unsafe Type Casting

Using `as` for type conversion truncates values without warning.

```rust
// VULNERABLE: Silent truncation
let large_amount: u128 = 5_000_000_000_000;
let truncated: u64 = large_amount as u64;  // Silently truncates to wrong value!

// VULNERABLE: Signed/unsigned conversion
let negative: i64 = -1;
let unsigned: u64 = negative as u64;  // Becomes 18446744073709551615!
```

## Exploit Scenarios

### Underflow Attack

```
Attacker balance: 100 tokens
Attacker attempts transfer: 200 tokens

Without checked math:
  balance = 100 - 200 = 18446744073709551516 (wrapped)

Attacker now has massive balance!
```

### Precision Arbitrage

```
Protocol calculates: shares = (deposit * total_shares) / total_assets

If deposit=1, total_shares=1000, total_assets=1001:
  shares = (1 * 1000) / 1001 = 0

Attacker deposits 1001 times with amount=1:
  Gets 0 shares each time, but adds 1001 to total_assets

Then deposits large amount:
  Gets disproportionate shares due to manipulated ratio
```

### Rounding Exploit

```
Protocol rounds UP for withdrawals:
  User withdraws 1.4 tokens → gets 2 tokens

Attacker exploits:
  1. Deposit 1000 tokens, get 1000 shares
  2. Withdraw in tiny increments, each rounds up
  3. Extract more than deposited
```

## Secure Implementations

### Anchor: Checked Arithmetic

```rust
use anchor_lang::prelude::*;

pub fn transfer(ctx: Context<Transfer>, amount: u64) -> Result<()> {
    // SECURE: Checked subtraction returns error on underflow
    ctx.accounts.source.balance = ctx.accounts.source.balance
        .checked_sub(amount)
        .ok_or(ErrorCode::InsufficientFunds)?;

    // SECURE: Checked addition returns error on overflow
    ctx.accounts.dest.balance = ctx.accounts.dest.balance
        .checked_add(amount)
        .ok_or(ErrorCode::Overflow)?;

    Ok(())
}

pub fn calculate_fee(amount: u64, fee_bps: u64) -> Result<u64> {
    // SECURE: Multiply first, then divide
    amount
        .checked_mul(fee_bps)
        .ok_or(ErrorCode::Overflow)?
        .checked_div(10000)
        .ok_or(ErrorCode::DivisionByZero)
}
```

### Anchor: Enable Overflow Checks in Cargo.toml

```toml
[profile.release]
overflow-checks = true  # Panic on overflow even in release
```

### Pinocchio: Checked Operations

```rust
pub fn process_transfer(accounts: &[AccountInfo], amount: u64) -> ProgramResult {
    let source = &accounts[0];
    let dest = &accounts[1];

    let mut source_data = source.try_borrow_mut_data()?;
    let mut dest_data = dest.try_borrow_mut_data()?;

    let source_balance = u64::from_le_bytes(source_data[0..8].try_into().unwrap());
    let dest_balance = u64::from_le_bytes(dest_data[0..8].try_into().unwrap());

    // SECURE: Checked arithmetic
    let new_source = source_balance
        .checked_sub(amount)
        .ok_or(ProgramError::InsufficientFunds)?;

    let new_dest = dest_balance
        .checked_add(amount)
        .ok_or(ProgramError::ArithmeticOverflow)?;

    source_data[0..8].copy_from_slice(&new_source.to_le_bytes());
    dest_data[0..8].copy_from_slice(&new_dest.to_le_bytes());

    Ok(())
}
```

### Safe Division with Zero Check

```rust
pub fn safe_divide(numerator: u64, denominator: u64) -> Result<u64> {
    if denominator == 0 {
        return Err(ErrorCode::DivisionByZero.into());
    }

    numerator
        .checked_div(denominator)
        .ok_or(ErrorCode::Overflow.into())
}
```

### Safe Type Casting

```rust
// SECURE: Use try_from for safe conversion
pub fn safe_cast(amount: u128) -> Result<u64> {
    u64::try_from(amount)
        .map_err(|_| ErrorCode::CastOverflow)?
}

// SECURE: Check bounds before casting
pub fn bounded_cast(amount: u128, max: u64) -> Result<u64> {
    if amount > max as u128 {
        return Err(ErrorCode::AmountTooLarge.into());
    }
    Ok(amount as u64)
}
```

### Precision-Safe Calculations

```rust
/// Calculate shares with proper precision handling
pub fn calculate_shares(
    deposit: u64,
    total_shares: u64,
    total_assets: u64,
) -> Result<u64> {
    if total_assets == 0 {
        // First depositor gets 1:1
        return Ok(deposit);
    }

    // SECURE: Use u128 for intermediate calculation to prevent overflow
    let shares = (deposit as u128)
        .checked_mul(total_shares as u128)
        .ok_or(ErrorCode::Overflow)?
        .checked_div(total_assets as u128)
        .ok_or(ErrorCode::DivisionByZero)?;

    // SECURE: Safe downcast
    u64::try_from(shares)
        .map_err(|_| ErrorCode::Overflow.into())
}

/// Always round DOWN for user benefit calculations (withdrawals, rewards)
pub fn floor_divide(numerator: u64, denominator: u64) -> Result<u64> {
    numerator
        .checked_div(denominator)
        .ok_or(ErrorCode::DivisionByZero.into())
}

/// Round UP only when protocol should benefit (fees, collateral requirements)
pub fn ceil_divide(numerator: u64, denominator: u64) -> Result<u64> {
    if denominator == 0 {
        return Err(ErrorCode::DivisionByZero.into());
    }

    // ceiling = (n + d - 1) / d
    Ok((numerator.saturating_add(denominator.saturating_sub(1))) / denominator)
}
```

## Detection Checklist

When auditing, look for:

- [ ] Basic arithmetic operators (`+`, `-`, `*`, `/`) on financial values
- [ ] Division before multiplication in calculations
- [ ] Missing zero checks before division
- [ ] Type casting with `as` keyword
- [ ] `saturating_*` operations where precision matters
- [ ] `try_round_u64()` instead of `try_floor_u64()`
- [ ] Missing `overflow-checks = true` in Cargo.toml

## Best Practices

### 1. Always Use Checked Arithmetic

```rust
// GOOD
let result = a.checked_add(b).ok_or(Error::Overflow)?;

// BAD
let result = a + b;
```

### 2. Multiply Before Divide

```rust
// GOOD: Multiply first preserves precision
let fee = amount.checked_mul(fee_bps)?.checked_div(10000)?;

// BAD: Division first loses precision
let fee = amount.checked_div(10000)?.checked_mul(fee_bps)?;
```

### 3. Use Wider Types for Intermediate Calculations

```rust
// GOOD: Use u128 for intermediate, downcast result
let intermediate = (a as u128) * (b as u128);
let result = u64::try_from(intermediate / c)?;

// BAD: Overflow in u64 multiplication
let result = (a * b) / c;
```

### 4. Floor for User Benefits, Ceil for Protocol Benefits

```rust
// User withdrawal: round DOWN (user gets slightly less)
let withdrawal = total.checked_div(shares)?;

// Protocol fee: round UP (protocol gets slightly more)
let fee = ceil_divide(amount, 100)?;
```

### 5. Enable Overflow Checks in Release

```toml
[profile.release]
overflow-checks = true
```

## Key Takeaways

1. **Never use basic operators** (`+`, `-`, `*`, `/`) for financial math
2. **Always use checked_* methods** that return Option/Result
3. **Multiply before divide** to preserve precision
4. **Check for zero** before any division
5. **Use try_from for casting** instead of `as`
6. **Use wider intermediate types** (u128) to prevent overflow
7. **Round down for user benefits**, up for protocol fees
8. **Enable overflow-checks** in release profile

## Sources

- [Cantina - Securing Solana](https://cantina.xyz/blog/securing-solana-a-developers-guide)
- [SlowMist - Solana Smart Contract Security](https://github.com/slowmist/solana-smart-contract-security-best-practices)
- [ScaleBit - Solana Security Practices](https://www.scalebit.xyz/blog/post/best-solana-security-practices-guide.html)
