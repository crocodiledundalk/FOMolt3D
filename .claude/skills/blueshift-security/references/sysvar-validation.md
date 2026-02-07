# Sysvar Account Validation

Sysvar (system variable) accounts contain cluster-wide state like clock, rent, and instructions. If programs don't validate sysvar addresses, attackers can substitute fake accounts with manipulated data.

## Severity: Critical

The Wormhole bridge exploit ($320M) was caused by insufficient sysvar validation. Attackers can manipulate time, rent calculations, or instruction introspection by passing fake sysvars.

## The Vulnerability

### Core Issue

Sysvars are special accounts at known addresses. If a program accepts a sysvar as an argument without validating its address, attackers can pass any account with fabricated data that the program will trust as authoritative system state.

### Common Sysvars

| Sysvar | Address | Purpose |
|--------|---------|---------|
| Clock | `SysvarC1ock11111111111111111111111111111111` | Current slot, timestamp |
| Rent | `SysvarRent111111111111111111111111111111111` | Rent exemption thresholds |
| Instructions | `Sysvar1nstructions1111111111111111111111111` | Current transaction instructions |
| StakeHistory | `SysvarStakeHistory1111111111111111111111111` | Stake activation history |
| EpochSchedule | `SysvarEpochScheworke1111111111111111111111111` | Epoch timing |

### Vulnerable Pattern (Anchor)

```rust
#[derive(Accounts)]
pub struct TimeLockedWithdraw<'info> {
    pub user: Signer<'info>,
    #[account(mut)]
    pub vault: Account<'info, Vault>,
    // VULNERABLE: UncheckedAccount allows any account
    /// CHECK: Clock sysvar
    pub clock: UncheckedAccount<'info>,
}

pub fn withdraw(ctx: Context<TimeLockedWithdraw>) -> Result<()> {
    // VULNERABLE: Deserializing unvalidated account as Clock
    let clock = Clock::from_account_info(&ctx.accounts.clock)?;

    // Attacker can pass fake clock with future timestamp
    if clock.unix_timestamp < ctx.accounts.vault.unlock_time {
        return Err(ErrorCode::VaultLocked.into());
    }

    // Vault unlocked with fake time!
    transfer_funds(...)?;
    Ok(())
}
```

### Vulnerable Pattern (Pinocchio)

```rust
pub fn process_withdraw(accounts: &[AccountInfo]) -> ProgramResult {
    let user = &accounts[0];
    let vault = &accounts[1];
    let clock_account = &accounts[2];  // VULNERABLE: No validation

    // VULNERABLE: Trusting unvalidated account as clock
    let clock_data = clock_account.try_borrow_data()?;
    let timestamp = i64::from_le_bytes(clock_data[32..40].try_into().unwrap());

    let vault_data = vault.try_borrow_data()?;
    let unlock_time = i64::from_le_bytes(vault_data[0..8].try_into().unwrap());

    if timestamp < unlock_time {
        return Err(ProgramError::Custom(1));  // "Locked"
    }

    // Attacker bypassed time lock!
    Ok(())
}
```

## The Wormhole Exploit

### What Happened

```
Wormhole bridge verified signatures using the Instructions sysvar.
The verification function accepted any account as the "instructions" parameter.

Attack:
1. Attacker created fake account mimicking Instructions sysvar data
2. Fabricated data showed valid signatures for unauthorized mint
3. Bridge minted 120,000 wETH ($320M) to attacker

Root cause: No validation that instructions_acc.key == sysvar::instructions::id()
```

### Vulnerable Code Pattern

```rust
// From the exploit - VULNERABLE
pub fn verify_signatures(
    accounts: &[AccountInfo],
) -> ProgramResult {
    let instruction_acc = &accounts[0];

    // VULNERABLE: No address check!
    // Directly deserializes as if it were the real Instructions sysvar
    let current_instruction = load_current_index_checked(instruction_acc)?;
    // ...
}
```

## Secure Implementations

### Anchor: Use Sysvar Type (Recommended)

```rust
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct TimeLockedWithdraw<'info> {
    pub user: Signer<'info>,
    #[account(mut)]
    pub vault: Account<'info, Vault>,
    // SECURE: Sysvar<Clock> validates address automatically
    pub clock: Sysvar<'info, Clock>,
}

pub fn withdraw(ctx: Context<TimeLockedWithdraw>) -> Result<()> {
    // SECURE: clock is guaranteed to be the real Clock sysvar
    if ctx.accounts.clock.unix_timestamp < ctx.accounts.vault.unlock_time {
        return Err(ErrorCode::VaultLocked.into());
    }

    transfer_funds(...)?;
    Ok(())
}
```

### Anchor: Manual Validation (If UncheckedAccount Required)

```rust
use solana_program::sysvar;

#[derive(Accounts)]
pub struct MyInstruction<'info> {
    /// CHECK: Validated in instruction
    pub clock: UncheckedAccount<'info>,
}

pub fn my_instruction(ctx: Context<MyInstruction>) -> Result<()> {
    // SECURE: Explicit address validation
    require_keys_eq!(
        ctx.accounts.clock.key(),
        sysvar::clock::ID,
        ErrorCode::InvalidSysvar
    );

    let clock = Clock::from_account_info(&ctx.accounts.clock)?;
    // Now safe to use
    Ok(())
}
```

### Anchor: Use Clock::get() (Best for Clock)

```rust
pub fn withdraw(ctx: Context<TimeLockedWithdraw>) -> Result<()> {
    // SECURE: Gets clock directly from runtime, no account needed
    let clock = Clock::get()?;

    if clock.unix_timestamp < ctx.accounts.vault.unlock_time {
        return Err(ErrorCode::VaultLocked.into());
    }

    Ok(())
}
```

### Pinocchio: Explicit Address Validation

```rust
use solana_program::sysvar;

pub fn process_withdraw(accounts: &[AccountInfo]) -> ProgramResult {
    let user = &accounts[0];
    let vault = &accounts[1];
    let clock_account = &accounts[2];

    // SECURE: Validate sysvar address
    if !clock_account.key().eq(&sysvar::clock::ID) {
        return Err(ProgramError::InvalidArgument);
    }

    // Now safe to deserialize
    let clock = Clock::from_account_info(clock_account)?;

    // ...
}
```

### Pinocchio: Constant Address Check

```rust
use pinocchio::sysvars::{clock::Clock, Sysvar};

pub fn process_instruction(accounts: &[AccountInfo]) -> ProgramResult {
    let clock_account = &accounts[0];

    // SECURE: Check against known constant
    const CLOCK_ID: Pubkey = pubkey!("SysvarC1ock11111111111111111111111111111111");

    if !clock_account.key().eq(&CLOCK_ID) {
        return Err(ProgramError::InvalidArgument);
    }

    let clock = Clock::from_account_info(clock_account)?;
    Ok(())
}
```

### Pinocchio: Instructions Sysvar Validation

```rust
use solana_program::sysvar::instructions;

pub fn verify_signatures(accounts: &[AccountInfo]) -> ProgramResult {
    let instruction_acc = &accounts[0];

    // SECURE: Validate Instructions sysvar address (prevents Wormhole-style attack)
    if !instruction_acc.key().eq(&instructions::ID) {
        return Err(ProgramError::InvalidArgument);
    }

    // Now safe to use for instruction introspection
    let current_ix = instructions::load_current_index_checked(instruction_acc)?;
    let ix_data = instructions::load_instruction_at_checked(current_ix as usize, instruction_acc)?;

    // ...
}
```

## Sysvar Address Constants

```rust
use solana_program::sysvar;

// Use these constants for validation
pub const CLOCK: Pubkey = sysvar::clock::ID;
pub const RENT: Pubkey = sysvar::rent::ID;
pub const INSTRUCTIONS: Pubkey = sysvar::instructions::ID;
pub const STAKE_HISTORY: Pubkey = sysvar::stake_history::ID;
pub const EPOCH_SCHEDULE: Pubkey = sysvar::epoch_schedule::ID;
pub const SLOT_HASHES: Pubkey = sysvar::slot_hashes::ID;
pub const RECENT_BLOCKHASHES: Pubkey = sysvar::recent_blockhashes::ID;
```

## Detection Checklist

When auditing, look for:

- [ ] `UncheckedAccount` used for sysvar accounts
- [ ] Clock/Rent/Instructions deserialized without address check
- [ ] Sysvar accounts passed as generic `AccountInfo`
- [ ] Time-based logic using unvalidated clock
- [ ] Instruction introspection without address validation
- [ ] Rent calculations using unvalidated rent sysvar

## Best Practices

### 1. Use Typed Sysvar Accounts in Anchor

```rust
// BEST: Type-safe, auto-validated
pub clock: Sysvar<'info, Clock>,
pub rent: Sysvar<'info, Rent>,
```

### 2. Use Direct Sysvar Access When Available

```rust
// No account needed, always authentic
let clock = Clock::get()?;
let rent = Rent::get()?;
```

### 3. Always Validate Before Deserializing

```rust
// If you must use UncheckedAccount
if account.key != &sysvar::clock::ID {
    return Err(ErrorCode::InvalidSysvar);
}
let clock = Clock::from_account_info(account)?;
```

### 4. Hardcode Addresses as Constants

```rust
// Define once, use everywhere
const CLOCK_SYSVAR: Pubkey = pubkey!("SysvarC1ock11111111111111111111111111111111");

// Validate against constant
require_keys_eq!(account.key(), CLOCK_SYSVAR);
```

## Key Takeaways

1. **Wormhole lost $320M** due to missing sysvar validation
2. **Always use `Sysvar<'info, T>`** in Anchor for automatic validation
3. **Use `Clock::get()` / `Rent::get()`** when possible (no account needed)
4. **Always validate address** before deserializing sysvar data
5. **Hardcode sysvar addresses** as constants in your program
6. **Instructions sysvar is critical** - validate for any signature verification

## Sources

- [SlowMist - Solana Smart Contract Security](https://github.com/slowmist/solana-smart-contract-security-best-practices)
- [Wormhole Post-Mortem Analysis](https://blog.seriouslabs.io/wormhole-bridge-hack-analysis)
- [Solana Documentation - Sysvars](https://docs.solana.com/developing/runtime-facilities/sysvars)
