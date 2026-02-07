# Bump Seed Canonicalization

Bump seed canonicalization refers to using the canonical (highest valid) bump seed when deriving PDAs. Failing to use or validate the canonical bump can allow attackers to create multiple valid PDAs for the same logical entity.

## Severity: High

Non-canonical bumps can enable duplicate accounts, bypassing uniqueness assumptions and potentially draining rewards or manipulating state.

## The Vulnerability

### Core Issue

Given a set of seeds, `create_program_address` produces a valid PDA about 50% of the time. The bump seed (0-255) is added to "bump" the address into valid PDA territory. Since there are ~128 valid bumps per seed set, **multiple valid PDAs exist for the same seeds**.

The **canonical bump** is the highest valid bump (found by `find_program_address`). Using non-canonical bumps allows creation of multiple "valid" PDAs.

### How PDA Derivation Works

```rust
// find_program_address - Returns CANONICAL bump (highest valid)
let (pda, canonical_bump) = find_program_address(&[b"user", user.as_ref()], program_id);
// canonical_bump might be 254

// create_program_address - Uses ANY bump you provide
let pda_254 = create_program_address(&[b"user", user.as_ref(), &[254]], program_id); // Valid
let pda_251 = create_program_address(&[b"user", user.as_ref(), &[251]], program_id); // Also valid!
let pda_248 = create_program_address(&[b"user", user.as_ref(), &[248]], program_id); // Also valid!
// All three are DIFFERENT addresses!
```

### Vulnerable Pattern (Anchor)

```rust
#[derive(Accounts)]
pub struct ClaimReward<'info> {
    pub user: Signer<'info>,
    // VULNERABLE: User provides bump, not validated as canonical
    #[account(
        init_if_needed,
        payer = user,
        space = 8 + UserClaim::SIZE,
        seeds = [b"claim", user.key().as_ref()],
        bump,  // Uses user-provided bump without validation
    )]
    pub claim_account: Account<'info, UserClaim>,
}

pub fn claim_reward(ctx: Context<ClaimReward>, bump: u8) -> Result<()> {
    // User can call this multiple times with different bumps!
    ctx.accounts.claim_account.claimed = true;
    transfer_reward_to_user()?;
    Ok(())
}
```

### Vulnerable Pattern (Pinocchio)

```rust
pub fn process_claim_reward(accounts: &[AccountInfo], bump: u8) -> ProgramResult {
    let user = &accounts[0];
    let claim_account = &accounts[1];

    // VULNERABLE: Using user-provided bump
    let expected_pda = create_program_address(
        &[b"claim", user.key().as_ref(), &[bump]],
        &crate::ID,
    ).ok_or(ProgramError::InvalidSeeds)?;

    if !claim_account.key().eq(&expected_pda) {
        return Err(ProgramError::InvalidSeeds);
    }

    // User can claim multiple times with different bumps!
    // bump=254: claim_account_A -> claim reward
    // bump=251: claim_account_B -> claim reward again!
    // bump=248: claim_account_C -> claim reward again!

    transfer_reward_to_user()?;
    Ok(())
}
```

## Exploit Scenario

### Multiple Reward Claims

```
Legitimate user flow:
  1. Call claim_reward with bump=254 (canonical)
  2. claim_account created, marked as claimed
  3. Receive 10 tokens

Attacker flow:
  1. Call claim_reward with bump=254 → Receive 10 tokens
  2. Call claim_reward with bump=251 → NEW account! Receive 10 more tokens
  3. Call claim_reward with bump=248 → NEW account! Receive 10 more tokens
  ...
  N. Repeat for all valid bumps

Result: "Attacker claimed 119 times and got 1190 tokens"
        (There are approximately 128 valid bumps)
```

### State Confusion

```
User creates profile with bump=254
Admin looks up profile with find_program_address (gets bump=254)
Attacker creates DIFFERENT profile with bump=251

Now there are TWO "user profiles" for the same user!
```

## Secure Implementations

### Anchor: Use find_program_address (Recommended)

```rust
#[derive(Accounts)]
pub struct ClaimReward<'info> {
    pub user: Signer<'info>,
    // SECURE: Anchor's bump constraint uses canonical bump
    #[account(
        init,
        payer = user,
        space = 8 + UserClaim::SIZE,
        seeds = [b"claim", user.key().as_ref()],
        bump,  // Anchor finds canonical bump automatically
    )]
    pub claim_account: Account<'info, UserClaim>,
}
```

### Anchor: Store and Validate Bump

```rust
#[account]
pub struct UserClaim {
    pub user: Pubkey,
    pub claimed: bool,
    pub bump: u8,  // Store the canonical bump
}

#[derive(Accounts)]
pub struct ClaimReward<'info> {
    pub user: Signer<'info>,
    #[account(
        seeds = [b"claim", user.key().as_ref()],
        bump = claim_account.bump,  // Validate against stored bump
    )]
    pub claim_account: Account<'info, UserClaim>,
}
```

### Pinocchio: Use find_program_address

```rust
pub fn process_claim_reward(accounts: &[AccountInfo]) -> ProgramResult {
    let user = &accounts[0];
    let claim_account = &accounts[1];

    // SECURE: Use find_program_address to get canonical bump
    let (expected_pda, canonical_bump) = find_program_address(
        &[b"claim", user.key().as_ref()],
        &crate::ID,
    );

    if !claim_account.key().eq(&expected_pda) {
        return Err(ProgramError::InvalidSeeds);
    }

    // Only ONE valid PDA per user now
    // ...
}
```

### Pinocchio: Store and Validate Canonical Bump

```rust
pub fn process_initialize(accounts: &[AccountInfo]) -> ProgramResult {
    let user = &accounts[0];
    let claim_account = &accounts[1];

    // Find canonical bump
    let (expected_pda, canonical_bump) = find_program_address(
        &[b"claim", user.key().as_ref()],
        &crate::ID,
    );

    // Store the bump in account data
    let mut data = claim_account.try_borrow_mut_data()?;
    let state = ClaimState::from_bytes_mut(&mut data)?;
    state.bump = canonical_bump;  // Store for future validation

    Ok(())
}

pub fn process_claim(accounts: &[AccountInfo]) -> ProgramResult {
    let claim_account = &accounts[1];

    let data = claim_account.try_borrow_data()?;
    let state = ClaimState::from_bytes(&data)?;

    // SECURE: Validate using stored canonical bump
    let expected_pda = create_program_address(
        &[b"claim", user.key().as_ref(), &[state.bump]],
        &crate::ID,
    ).ok_or(ProgramError::InvalidSeeds)?;

    if !claim_account.key().eq(&expected_pda) {
        return Err(ProgramError::InvalidSeeds);
    }

    // ...
}
```

## Best Practices

### 1. Always Use find_program_address for Derivation

```rust
// GOOD: Canonical bump
let (pda, bump) = find_program_address(&seeds, program_id);

// BAD: User-provided bump
let pda = create_program_address(&[...seeds, &[user_bump]], program_id);
```

### 2. Store Canonical Bump in Account

```rust
#[account]
pub struct MyAccount {
    pub data: u64,
    pub bump: u8,  // Store canonical bump
}
```

### 3. Validate Bump on Every Access

```rust
#[account(
    seeds = [b"account", user.key().as_ref()],
    bump = my_account.bump,  // Validate stored bump
)]
pub my_account: Account<'info, MyAccount>,
```

### 4. Never Trust User-Provided Bumps

```rust
// BAD: Trusting user input
pub fn process(bump: u8) {
    let pda = create_program_address(&[..., &[bump]], id);
}

// GOOD: Derive canonical bump
pub fn process() {
    let (pda, bump) = find_program_address(&[...], id);
}
```

## Detection Checklist

When auditing, look for:

- [ ] `create_program_address` with user-provided bump
- [ ] Bump passed as instruction argument
- [ ] Missing bump validation against stored value
- [ ] PDAs without stored bump in account data
- [ ] `init_if_needed` without bump canonicalization

## Testing for the Vulnerability

```rust
#[test]
fn test_bump_canonicalization() {
    let (canonical_pda, canonical_bump) = find_program_address(
        &[b"claim", user.as_ref()],
        &program_id,
    );

    // Find a non-canonical valid bump
    let mut non_canonical_bump = canonical_bump - 1;
    while create_program_address(
        &[b"claim", user.as_ref(), &[non_canonical_bump]],
        &program_id,
    ).is_none() {
        non_canonical_bump -= 1;
    }

    // Try to claim with non-canonical bump
    let result = claim_reward(user, non_canonical_bump);

    // Should fail if properly protected
    assert!(result.is_err(), "Should reject non-canonical bump!");
}

#[test]
fn test_no_double_claim() {
    // Claim with canonical bump
    claim_reward(user);

    // Try to claim again (should fail even with different approach)
    let result = claim_reward(user);
    assert!(result.is_err(), "Should not allow double claim!");
}
```

## Performance Note

`find_program_address` is more expensive than `create_program_address` (~1500 CUs vs ~200 CUs). To optimize:

1. Use `find_program_address` once during initialization
2. Store the canonical bump in account data
3. Use `create_program_address` with stored bump for subsequent operations

```rust
// Initialization (expensive but one-time)
let (pda, bump) = find_program_address(&seeds, program_id);
account.bump = bump;

// Subsequent access (cheap)
let pda = create_program_address(&[...seeds, &[account.bump]], program_id);
```

## Key Takeaways

1. **~128 valid bumps exist** per seed set - not just one
2. **Always use canonical bump** (from `find_program_address`)
3. **Store bump in account data** for efficient re-derivation
4. **Never trust user-provided bumps** as instruction arguments
5. **Anchor handles this automatically** with `bump` constraint
6. **Non-canonical bumps = duplicate PDAs** = bypassed uniqueness

## Sources

- [Solana Official - Bump Seed Canonicalization](https://solana.com/developers/courses/program-security/bump-seed-canonicalization)
- [Helius - A Hitchhiker's Guide to Solana Program Security](https://www.helius.dev/blog/a-hitchhikers-guide-to-solana-program-security)
- [SlowMist - Solana Smart Contract Security Best Practices](https://github.com/slowmist/solana-smart-contract-security-best-practices)
