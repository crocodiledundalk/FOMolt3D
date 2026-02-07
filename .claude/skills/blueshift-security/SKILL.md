---
name: blueshift-security
description: Audit Solana programs for security vulnerabilities using Blueshift patterns. Use when reviewing smart contract security, finding exploits, implementing defensive patterns, or learning common Solana attack vectors. Covers both Anchor and Pinocchio/Native implementations.
---

# Solana Program Security (Blueshift Patterns)

Comprehensive security patterns for auditing and hardening Solana programs. Based on the Blueshift Program Security course and modeled on real-world vulnerabilities from the Sealevel Attacks repository.

## Security Philosophy

Security in Solana requires a **multi-layer validation framework**:

1. **Structural Validation** - Account ownership and type verification
2. **Authorization Validation** - Cryptographic signature verification
3. **Logical Validation** - Data relationships and business rules
4. **State Validation** - Account lifecycle management

## Vulnerability Categories

### Reference Documentation

| Vulnerability | Description | Severity |
|--------------|-------------|----------|
| [signer-checks.md](references/signer-checks.md) | Missing signature verification | Critical |
| [owner-checks.md](references/owner-checks.md) | Account ownership validation | Critical |
| [data-matching.md](references/data-matching.md) | Account data relationship validation | High |
| [duplicate-accounts.md](references/duplicate-accounts.md) | Same account passed multiple times | High |
| [reinitialization.md](references/reinitialization.md) | Overwriting initialized accounts | Critical |
| [revival-attacks.md](references/revival-attacks.md) | Zombie accounts after closure | High |
| [arbitrary-cpi.md](references/arbitrary-cpi.md) | Unvalidated cross-program invocation | Critical |
| [type-cosplay.md](references/type-cosplay.md) | Account type impersonation | Critical |
| [pda-sharing.md](references/pda-sharing.md) | Insufficient PDA seed specificity | High |
| [bump-seed-canonicalization.md](references/bump-seed-canonicalization.md) | Non-canonical bump allows duplicate PDAs | High |
| [account-reloading.md](references/account-reloading.md) | Stale account data after CPI | Medium-High |
| [arithmetic-vulnerabilities.md](references/arithmetic-vulnerabilities.md) | Integer overflow, precision loss, unsafe casting | High |
| [remaining-accounts.md](references/remaining-accounts.md) | Unvalidated ctx.remaining_accounts | High |
| [sysvar-validation.md](references/sysvar-validation.md) | Fake sysvar accounts (Wormhole exploit) | Critical |
| [oracle-validation.md](references/oracle-validation.md) | Stale/manipulated price feeds | Critical |
| [frontrunning.md](references/frontrunning.md) | Initialization capture, sandwich attacks | High-Critical |

## Quick Reference: Essential Checks

### Every Instruction Must Validate

```rust
// 1. SIGNER CHECK - Is the authority actually signing?
if !authority.is_signer() {
    return Err(ProgramError::MissingRequiredSignature);
}

// 2. OWNER CHECK - Is the account owned by expected program?
if !account.is_owned_by(&expected_program_id) {
    return Err(ProgramError::IllegalOwner);
}

// 3. TYPE CHECK - Is this the right account type? (discriminator)
if account_data[0] != EXPECTED_DISCRIMINATOR {
    return Err(ProgramError::InvalidAccountData);
}

// 4. DATA MATCH - Do account relationships match?
if stored_owner != signer.key() {
    return Err(ProgramError::InvalidAccountData);
}

// 5. DUPLICATE CHECK - Are mutable accounts unique?
if account_a.key() == account_b.key() {
    return Err(ProgramError::InvalidArgument);
}
```

### Anchor Secure Patterns

```rust
#[derive(Accounts)]
pub struct SecureInstruction<'info> {
    // Signer check (automatic)
    pub authority: Signer<'info>,

    // Owner check + type check (automatic with Account<T>)
    #[account(
        mut,
        has_one = authority,  // Data matching
        seeds = [b"vault", authority.key().as_ref()],  // PDA specificity
        bump,
    )]
    pub vault: Account<'info, Vault>,

    // Program validation (prevents arbitrary CPI)
    pub token_program: Program<'info, Token>,

    pub system_program: Program<'info, System>,
}

#[account]
pub struct Vault {
    pub authority: Pubkey,  // For has_one constraint
    pub balance: u64,
    pub bump: u8,
}
```

### Pinocchio Secure Patterns

```rust
impl<'a> TryFrom<&'a [AccountInfo]> for SecureAccounts<'a> {
    type Error = ProgramError;

    fn try_from(accounts: &'a [AccountInfo]) -> Result<Self, Self::Error> {
        let [authority, vault, token_program, ..] = accounts else {
            return Err(ProgramError::NotEnoughAccountKeys);
        };

        // 1. Signer check
        if !authority.is_signer() {
            return Err(ProgramError::MissingRequiredSignature);
        }

        // 2. Owner check
        if !vault.is_owned_by(&crate::ID) {
            return Err(ProgramError::IllegalOwner);
        }

        // 3. Type check (discriminator)
        let data = vault.try_borrow_data()?;
        if data[0] != VAULT_DISCRIMINATOR {
            return Err(ProgramError::InvalidAccountData);
        }

        // 4. Data matching
        let vault_state = VaultState::from_bytes(&data)?;
        if !vault_state.authority.eq(authority.key()) {
            return Err(ProgramError::InvalidAccountData);
        }

        // 5. Program validation
        if !token_program.key().eq(&pinocchio_token::ID) {
            return Err(ProgramError::IncorrectProgramId);
        }

        Ok(Self { authority, vault, token_program })
    }
}
```

## Attack Vector Summary

| Attack | Root Cause | Prevention |
|--------|-----------|------------|
| Unauthorized access | Missing signer check | `Signer<'info>` or `is_signer()` |
| Fake account injection | Missing owner check | `Account<T>` or `is_owned_by()` |
| Account confusion | Missing type check | Discriminators |
| Relationship bypass | Missing data match | `has_one` or manual validation |
| State overwrite | Missing init check | `init` constraint or discriminator check |
| Zombie accounts | Incomplete closure | Zero data + close constraint |
| Malicious CPI | Unvalidated program | `Program<T>` or ID validation |
| Type impersonation | Same data layout | Unique discriminators |
| Cross-user access | Shared PDA seeds | User-specific seeds |
| Duplicate PDAs | Non-canonical bump | `find_program_address` or store canonical bump |
| Stale data exploit | Missing reload after CPI | `reload()` or re-borrow data |
| Integer overflow | Unchecked arithmetic | `checked_add/sub/mul/div` |
| Precision loss | Division before multiply | Multiply first, use wider types |
| Remaining accounts | Unvalidated dynamic accounts | Manual owner/type/data validation |
| Fake sysvar | Unvalidated system accounts | `Sysvar<T>` or address check |
| Oracle manipulation | Missing price validation | Status, staleness, confidence checks |
| Frontrunning | No slippage/deadline protection | min_amount_out, deadline params |
| Init capture | Anyone can initialize | Check upgrade_authority |

## Security Audit Checklist

### For Each Instruction

- [ ] **Signer validation** - All authorities are verified signers
- [ ] **Owner validation** - All program accounts have correct owner
- [ ] **Type validation** - Discriminators checked before deserialization
- [ ] **Data validation** - Account relationships verified (has_one)
- [ ] **Duplicate check** - Mutable accounts are unique
- [ ] **Program validation** - CPI targets are verified

### For Initialization

- [ ] **Init guard** - Cannot reinitialize existing accounts
- [ ] **Space allocation** - Correct size with discriminator
- [ ] **PDA derivation** - Seeds include user-specific data

### For Account Closure

- [ ] **Balance check** - All funds transferred out
- [ ] **Data zeroing** - Account data cleared
- [ ] **Lamport drain** - All lamports removed
- [ ] **Discriminator update** - Marked as closed

### For PDAs

- [ ] **Seed specificity** - Seeds unique per user/context
- [ ] **Bump storage** - Canonical bump stored and used
- [ ] **Authority separation** - Separate PDAs for different purposes
- [ ] **Canonical bump** - Use `find_program_address`, never user-provided bumps

### For CPI Operations

- [ ] **Account reload** - Call `reload()` after CPI modifies accounts
- [ ] **Data freshness** - Re-borrow data after CPI in Pinocchio
- [ ] **Balance calculations** - Don't use pre-CPI values for post-CPI logic

### For Arithmetic

- [ ] **Checked arithmetic** - Use `checked_add/sub/mul/div`, not `+/-/*/`
- [ ] **Multiply before divide** - Preserve precision in calculations
- [ ] **Safe casting** - Use `try_from()` instead of `as`
- [ ] **Zero checks** - Validate divisor before division
- [ ] **Overflow checks** - Enable in Cargo.toml for release builds

### For External Data

- [ ] **Sysvar validation** - Use `Sysvar<T>` or validate addresses
- [ ] **Oracle validation** - Check status, staleness, confidence
- [ ] **Price sanity** - Bounds check oracle prices
- [ ] **remaining_accounts** - Validate owner/type/data for each

### For User Protection

- [ ] **Slippage protection** - Require minimum_amount_out for swaps
- [ ] **Deadline protection** - Reject stale transactions
- [ ] **Expected values** - Require expected_price for purchases
- [ ] **Init protection** - Only upgrade_authority can initialize

## Framework Comparison

| Check | Anchor | Pinocchio |
|-------|--------|-----------|
| Signer | `Signer<'info>` | `is_signer()` |
| Owner | `Account<'info, T>` | `is_owned_by()` |
| Type | Automatic (8-byte discriminator) | Manual discriminator check |
| Data match | `has_one = field` | Manual comparison |
| Init guard | `init` constraint | Check discriminator != 0 |
| Close | `close = destination` | Zero data + drain lamports |
| Program | `Program<'info, T>` | `key().eq(&PROGRAM_ID)` |
| Canonical bump | `bump` in seeds (automatic) | `find_program_address()` |
| Account reload | `account.reload()` | Re-borrow `try_borrow_data()` |
| Sysvar | `Sysvar<'info, Clock>` | Validate `sysvar::clock::ID` |
| Checked math | `checked_add()` / `checked_sub()` | Same |
| Safe cast | `u64::try_from(val)?` | Same |

## Common Mistakes

### 1. Using UncheckedAccount

```rust
// DANGEROUS - No validation
pub account: UncheckedAccount<'info>,

// SAFE - Automatic validation
pub account: Account<'info, MyAccountType>,
```

### 2. init_if_needed Without Guards

```rust
// DANGEROUS - Silently continues on initialized accounts
#[account(init_if_needed, ...)]
pub account: Account<'info, Data>,

// SAFE - Fails if already initialized
#[account(init, ...)]
pub account: Account<'info, Data>,
```

### 3. Shared PDA Seeds

```rust
// DANGEROUS - Same PDA for all users
seeds = [b"vault", mint.key().as_ref()]

// SAFE - User-specific PDA
seeds = [b"vault", user.key().as_ref(), mint.key().as_ref()]
```

### 4. Missing Signer on Authority

```rust
// DANGEROUS - Anyone can pass any pubkey
pub authority: UncheckedAccount<'info>,
#[account(has_one = authority)]
pub vault: Account<'info, Vault>,

// SAFE - Must actually sign
pub authority: Signer<'info>,
#[account(has_one = authority)]
pub vault: Account<'info, Vault>,
```

## Resources

- **Blueshift Course**: [Program Security](https://learn.blueshift.gg/en/courses/program-security)
- **Sealevel Attacks**: [coral-xyz/sealevel-attacks](https://github.com/coral-xyz/sealevel-attacks)
- **Solana Security**: [Security Best Practices](https://solana.com/developers/guides/security)
- **Helius Guide**: [A Hitchhiker's Guide to Solana Program Security](https://www.helius.dev/blog/a-hitchhikers-guide-to-solana-program-security)
- **Cantina Guide**: [Securing Solana: A Developer's Guide](https://cantina.xyz/blog/securing-solana-a-developers-guide)
- **SlowMist**: [Solana Smart Contract Security Best Practices](https://github.com/slowmist/solana-smart-contract-security-best-practices)
- **ScaleBit**: [Best Solana Security Practices Guide](https://www.scalebit.xyz/blog/post/best-solana-security-practices-guide.html)

## Cross-Reference

This skill complements:
- **solana-security** - Comprehensive audit framework with detailed checklists
- **blueshift-pinocchio** - Pinocchio development patterns
- **anchor-or-native-solana-development** - Framework-specific security patterns
