# Remaining Accounts Validation

Remaining accounts (`ctx.remaining_accounts` in Anchor or accounts beyond the expected slice in native) provide flexibility but lack automatic validation. Attackers can inject malicious accounts through this unvalidated vector.

## Severity: High

Unvalidated remaining accounts can bypass security checks, inject malicious data, or redirect funds to attacker-controlled accounts.

## The Vulnerability

### Core Issue

In Anchor, `ctx.remaining_accounts` is an array of `AccountInfo` that bypasses all constraint validation. In native Solana programs, accounts beyond your validated set are similarly unchecked. Attackers can inject:

- Fake token accounts owned by attacker
- Malicious program accounts
- Accounts with manipulated data

### Vulnerable Pattern (Anchor)

```rust
#[derive(Accounts)]
pub struct BatchTransfer<'info> {
    pub authority: Signer<'info>,
    #[account(mut)]
    pub source: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    // remaining_accounts contains destination accounts - UNVALIDATED
}

pub fn batch_transfer(ctx: Context<BatchTransfer>, amounts: Vec<u64>) -> Result<()> {
    // VULNERABLE: No validation of remaining accounts
    for (i, dest) in ctx.remaining_accounts.iter().enumerate() {
        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.source.to_account_info(),
                to: dest.to_account_info(),  // Could be attacker's account!
                authority: ctx.accounts.authority.to_account_info(),
            },
        );
        transfer(cpi_ctx, amounts[i])?;
    }
    Ok(())
}
```

### Vulnerable Pattern (Pinocchio)

```rust
pub fn process_batch_transfer(accounts: &[AccountInfo], amounts: &[u64]) -> ProgramResult {
    let authority = &accounts[0];
    let source = &accounts[1];
    let token_program = &accounts[2];

    // VULNERABLE: Destinations are unvalidated
    let destinations = &accounts[3..];

    for (i, dest) in destinations.iter().enumerate() {
        // No owner check, no type check, nothing!
        transfer_tokens(source, dest, authority, amounts[i])?;
    }

    Ok(())
}
```

## Exploit Scenarios

### Malicious Destination Injection

```
Expected flow:
  User provides: [legitimate_user_1, legitimate_user_2]
  Funds go to legitimate users

Attack:
  Attacker provides: [attacker_account, attacker_account]
  All funds redirected to attacker
```

### Token Account Substitution

```
Protocol expects: TokenAccounts for USDC
Attacker provides: TokenAccounts for worthless token

If program doesn't validate mint:
  - Attacker receives real value
  - Victim receives worthless tokens
```

### Program Account Injection

```
Protocol iterates remaining_accounts to call programs:

for program in ctx.remaining_accounts {
    invoke(instruction, program)?;  // Arbitrary CPI!
}

Attacker injects malicious program → arbitrary code execution
```

## Secure Implementations

### Anchor: Manual Validation

```rust
use anchor_spl::token::{TokenAccount, Token};

pub fn batch_transfer(ctx: Context<BatchTransfer>, amounts: Vec<u64>) -> Result<()> {
    let expected_mint = ctx.accounts.source.mint;

    for (i, account_info) in ctx.remaining_accounts.iter().enumerate() {
        // SECURE: Validate each remaining account

        // 1. Owner check - must be token program
        if account_info.owner != &Token::id() {
            return Err(ErrorCode::InvalidAccountOwner.into());
        }

        // 2. Deserialize and validate
        let dest_account = Account::<TokenAccount>::try_from(account_info)?;

        // 3. Type check (implicit in Account<TokenAccount>)

        // 4. Data validation - correct mint
        if dest_account.mint != expected_mint {
            return Err(ErrorCode::InvalidMint.into());
        }

        // 5. Now safe to use
        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.source.to_account_info(),
                to: account_info.to_account_info(),
                authority: ctx.accounts.authority.to_account_info(),
            },
        );
        transfer(cpi_ctx, amounts[i])?;
    }
    Ok(())
}
```

### Anchor: Whitelist Approach

```rust
#[account]
pub struct BatchConfig {
    pub authority: Pubkey,
    pub allowed_destinations: Vec<Pubkey>,  // Whitelist
}

pub fn batch_transfer(ctx: Context<BatchTransfer>, amounts: Vec<u64>) -> Result<()> {
    let config = &ctx.accounts.config;

    for (i, account_info) in ctx.remaining_accounts.iter().enumerate() {
        // SECURE: Check against whitelist
        if !config.allowed_destinations.contains(account_info.key) {
            return Err(ErrorCode::UnauthorizedDestination.into());
        }

        // ... perform transfer
    }
    Ok(())
}
```

### Anchor: Expected Account Derivation

```rust
pub fn process_rewards(ctx: Context<ProcessRewards>) -> Result<()> {
    let user_keys = &ctx.accounts.config.registered_users;

    for (i, account_info) in ctx.remaining_accounts.iter().enumerate() {
        // SECURE: Derive expected PDA and compare
        let expected_pda = Pubkey::find_program_address(
            &[b"reward", user_keys[i].as_ref()],
            ctx.program_id,
        ).0;

        if account_info.key != &expected_pda {
            return Err(ErrorCode::InvalidRewardAccount.into());
        }

        // Now safe to use
    }
    Ok(())
}
```

### Pinocchio: Full Validation

```rust
pub fn process_batch_transfer(accounts: &[AccountInfo], amounts: &[u64]) -> ProgramResult {
    let authority = &accounts[0];
    let source = &accounts[1];
    let token_program = &accounts[2];
    let destinations = &accounts[3..];

    // Validate authority is signer
    if !authority.is_signer() {
        return Err(ProgramError::MissingRequiredSignature);
    }

    // Get source mint for validation
    let source_data = source.try_borrow_data()?;
    let source_mint = Pubkey::try_from(&source_data[0..32])?;

    for (i, dest) in destinations.iter().enumerate() {
        // SECURE: Validate each destination

        // 1. Owner check
        if !dest.is_owned_by(&spl_token::ID) {
            return Err(ProgramError::IllegalOwner);
        }

        // 2. Deserialize token account
        let dest_data = dest.try_borrow_data()?;
        if dest_data.len() < 72 {  // Minimum TokenAccount size
            return Err(ProgramError::InvalidAccountData);
        }

        // 3. Validate mint matches
        let dest_mint = Pubkey::try_from(&dest_data[0..32])?;
        if dest_mint != source_mint {
            return Err(ProgramError::InvalidAccountData);
        }

        // 4. Now safe to transfer
        transfer_tokens(source, dest, authority, amounts[i])?;
    }

    Ok(())
}
```

### Pinocchio: PDA Validation

```rust
pub fn process_with_pdas(accounts: &[AccountInfo], seeds_data: &[Vec<u8>]) -> ProgramResult {
    let validated_start = 3;  // First 3 accounts are validated
    let pda_accounts = &accounts[validated_start..];

    for (i, account_info) in pda_accounts.iter().enumerate() {
        // SECURE: Derive expected PDA
        let (expected_pda, _bump) = Pubkey::find_program_address(
            &[&seeds_data[i]],
            &crate::ID,
        );

        if !account_info.key().eq(&expected_pda) {
            return Err(ProgramError::InvalidSeeds);
        }

        // SECURE: Also verify ownership
        if !account_info.is_owned_by(&crate::ID) {
            return Err(ProgramError::IllegalOwner);
        }
    }

    Ok(())
}
```

## Validation Checklist

For each remaining account, verify:

- [ ] **Ownership** - Is it owned by the expected program?
- [ ] **Type** - Does the discriminator match expected type?
- [ ] **Data** - Do fields contain valid/expected values?
- [ ] **Relationship** - Does it relate to other accounts correctly?
- [ ] **Authorization** - Is it allowed based on whitelist/PDA derivation?

## Detection Checklist

When auditing, look for:

- [ ] `ctx.remaining_accounts` used without validation
- [ ] Accounts beyond expected slice used in native programs
- [ ] Missing owner checks on iterated accounts
- [ ] Missing discriminator/type validation
- [ ] Loops that invoke CPI with remaining accounts
- [ ] Token transfers to unvalidated destinations

## Best Practices

### 1. Prefer Fixed Account Structs

```rust
// BETTER: Explicit accounts with validation
#[derive(Accounts)]
pub struct Transfer<'info> {
    pub dest_1: Account<'info, TokenAccount>,
    pub dest_2: Account<'info, TokenAccount>,
    pub dest_3: Account<'info, TokenAccount>,
}

// RISKY: Dynamic remaining accounts
// Only use when truly necessary
```

### 2. Validate Every Property

```rust
for account in ctx.remaining_accounts {
    validate_owner(account)?;
    validate_type(account)?;
    validate_data(account)?;
    validate_relationship(account)?;
}
```

### 3. Use Whitelist When Possible

```rust
// Store allowed accounts in config
pub allowed_accounts: Vec<Pubkey>

// Check membership
if !config.allowed_accounts.contains(account.key) {
    return Err(ErrorCode::Unauthorized);
}
```

### 4. Derive Expected Addresses

```rust
// Compute what the account SHOULD be
let expected = derive_account_address(...);

// Verify it matches
if account.key != &expected {
    return Err(ErrorCode::InvalidAccount);
}
```

## Key Takeaways

1. **remaining_accounts bypass all Anchor constraints**
2. **Always validate owner, type, and data** for each remaining account
3. **Prefer fixed account structs** over dynamic remaining accounts
4. **Use whitelists or PDA derivation** to verify expected accounts
5. **Never use remaining accounts for CPI** without program ID validation
6. **Treat remaining accounts as fully attacker-controlled** input

## Sources

- [Cantina - Securing Solana](https://cantina.xyz/blog/securing-solana-a-developers-guide)
- [SlowMist - Solana Smart Contract Security](https://github.com/slowmist/solana-smart-contract-security-best-practices)
