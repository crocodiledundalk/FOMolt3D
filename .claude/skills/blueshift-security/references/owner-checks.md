# Owner Checks

Owner checks verify that accounts passed to instruction handlers are actually controlled by the expected program, preventing attackers from substituting malicious lookalike accounts.

## Severity: Critical

Missing owner checks allow attackers to inject fake accounts with manipulated data.

## The Vulnerability

### Core Issue

Every Solana account has an `owner` field identifying which program controls it. Without explicit verification, attackers can create structurally identical accounts they control and pass them to vulnerable instructions.

### How the Attack Works

1. Attacker creates their own account with matching data structure
2. Attacker passes it to an unprotected instruction
3. Program deserializes the data successfully (structure matches)
4. Program makes decisions based on attacker-controlled data
5. Attacker manipulates the outcome

**Critical Exception:** Solana's runtime automatically prevents unauthorized writes to accounts. Owner checks matter most for **read operations** and **validation logic** where your program makes decisions based on account data.

### Vulnerable Pattern (Anchor)

```rust
#[derive(Accounts)]
pub struct ProcessReward<'info> {
    pub user: Signer<'info>,
    // VULNERABLE: UncheckedAccount accepts any account
    #[account(mut)]
    pub reward_account: UncheckedAccount<'info>,
}
```

### Vulnerable Pattern (Pinocchio)

```rust
pub fn process_reward(accounts: &[AccountInfo]) -> ProgramResult {
    let user = &accounts[0];
    let reward_account = &accounts[1];

    // VULNERABLE: No owner verification
    let data = reward_account.try_borrow_data()?;
    let reward = RewardAccount::from_bytes(&data)?;

    // Attacker can pass fake account with inflated reward amount
    transfer_reward(reward.amount)?;

    Ok(())
}
```

## Exploit Scenario

```
Legitimate account: RewardAccount { user: Alice, amount: 100 }
                    owner: YourProgram

Attacker creates:   RewardAccount { user: Alice, amount: 1000000 }
                    owner: AttackerProgram

Attacker calls process_reward with their fake account
→ Program reads amount: 1000000
→ Program transfers inflated reward
```

## Secure Implementations

### Anchor: Using Account Type (Recommended)

```rust
#[derive(Accounts)]
pub struct ProcessReward<'info> {
    pub user: Signer<'info>,
    // SECURE: Account<T> automatically verifies owner
    #[account(mut)]
    pub reward_account: Account<'info, RewardAccount>,
}
```

The `Account<'info, T>` type automatically:
- Verifies the account is owned by the declaring program
- Deserializes and validates the account data
- Checks the discriminator

### Anchor: Explicit Owner Constraint

```rust
#[derive(Accounts)]
pub struct ProcessReward<'info> {
    pub user: Signer<'info>,
    // SECURE: Explicit owner constraint
    #[account(mut, owner = crate::ID)]
    pub reward_account: UncheckedAccount<'info>,
}
```

### Anchor: Runtime Check

```rust
pub fn process_reward(ctx: Context<ProcessReward>) -> Result<()> {
    // SECURE: Manual owner verification
    if ctx.accounts.reward_account.owner != &crate::ID {
        return Err(ProgramError::IncorrectProgramId.into());
    }

    // Proceed...
    Ok(())
}
```

### Pinocchio: Manual Validation

```rust
pub fn process_reward(accounts: &[AccountInfo]) -> ProgramResult {
    let user = &accounts[0];
    let reward_account = &accounts[1];

    // SECURE: Verify owner before trusting data
    if !reward_account.is_owned_by(&crate::ID) {
        return Err(ProgramError::IllegalOwner);
    }

    let data = reward_account.try_borrow_data()?;
    let reward = RewardAccount::from_bytes(&data)?;

    transfer_reward(reward.amount)?;
    Ok(())
}
```

### Pinocchio: TryFrom Pattern

```rust
impl<'a> TryFrom<&'a [AccountInfo]> for RewardAccounts<'a> {
    type Error = ProgramError;

    fn try_from(accounts: &'a [AccountInfo]) -> Result<Self, Self::Error> {
        let [user, reward_account, ..] = accounts else {
            return Err(ProgramError::NotEnoughAccountKeys);
        };

        // SECURE: Validate owner during parsing
        if !reward_account.is_owned_by(&crate::ID) {
            return Err(ProgramError::IllegalOwner);
        }

        Ok(Self { user, reward_account })
    }
}
```

## Special Cases

### Token Accounts

Token accounts are owned by the Token Program, not your program:

```rust
// Anchor
pub user_token_account: Account<'info, TokenAccount>,

// Pinocchio
if !token_account.is_owned_by(&spl_token::ID) &&
   !token_account.is_owned_by(&spl_token_2022::ID) {
    return Err(ProgramError::IllegalOwner);
}
```

### System Program Accounts

Uninitialized accounts are owned by System Program:

```rust
// Check account is uninitialized (for init)
if !account.is_owned_by(&system_program::ID) {
    return Err(ProgramError::AccountAlreadyInitialized);
}
```

## Detection Checklist

When auditing, look for:

- [ ] `UncheckedAccount` used without owner constraint
- [ ] Missing `is_owned_by()` checks before reading account data
- [ ] Program logic that trusts deserialized data without owner verification
- [ ] External account types without program validation

## Testing for the Vulnerability

```rust
#[test]
fn test_missing_owner_check() {
    // Create fake account owned by attacker
    let fake_account = Account {
        owner: attacker_program_id,  // Not your program!
        data: RewardAccount {
            user: victim,
            amount: 1_000_000,  // Inflated!
        }.try_to_vec().unwrap(),
        ..Default::default()
    };

    // If this succeeds with fake account, vulnerability exists
    let result = process_reward(&[user_account, fake_account]);
    assert!(result.is_err(), "Should reject foreign account!");
}
```

## Key Takeaways

1. **Use `Account<'info, T>`** in Anchor - it handles owner checks automatically
2. **Always call `is_owned_by()`** in Pinocchio before trusting account data
3. **Owner checks protect reads** - writes are protected by runtime
4. **Different programs own different accounts** - Token accounts ≠ your program
5. **Deserialization success ≠ account legitimacy** - structure can match but owner can differ
