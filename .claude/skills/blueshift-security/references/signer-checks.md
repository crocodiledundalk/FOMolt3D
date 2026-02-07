# Signer Checks

Signer checks verify that an account holder actually authorized a transaction. They're the digital equivalent of requiring a handwritten signature in Solana's trustless environment.

## Severity: Critical

Missing signer checks can lead to complete unauthorized access to user funds and account takeover.

## The Vulnerability

### Vulnerable Pattern (Anchor)

```rust
#[derive(Accounts)]
pub struct UpdateOwnership<'info> {
    // VULNERABLE: UncheckedAccount with only has_one
    pub owner: UncheckedAccount<'info>,
    #[account(mut, has_one = owner)]
    pub program_account: Account<'info, ProgramAccount>,
}
```

**The Fatal Flaw:** The `has_one = owner` constraint only validates that public keys match. It never verifies the account actually signed the transaction.

### Vulnerable Pattern (Pinocchio)

```rust
pub fn process_update(accounts: &[AccountInfo]) -> ProgramResult {
    let owner = &accounts[0];
    let program_account = &accounts[1];

    // VULNERABLE: No signer check
    // Just proceeding to update...
    Ok(())
}
```

## Exploit Scenario

An attacker can:
1. Find a target program account on-chain
2. Extract the current owner's public key from account data
3. Pass that legitimate public key in their transaction (without signing)
4. Set themselves as the new owner
5. Submit the transaction without the real owner's signature

The `has_one` constraint passes because addresses match, enabling unauthorized ownership transfer.

```
Attacker finds: Vault { owner: Alice, balance: 1000 }
Attacker calls: update_owner(owner: Alice's pubkey, new_owner: Attacker)
Result: Vault { owner: Attacker, balance: 1000 }  // Alice never signed!
```

## Secure Implementations

### Anchor: Using Signer Type (Recommended)

```rust
#[derive(Accounts)]
pub struct UpdateOwnership<'info> {
    // SECURE: Signer type enforces signature
    pub owner: Signer<'info>,
    #[account(mut, has_one = owner)]
    pub program_account: Account<'info, ProgramAccount>,
}
```

### Anchor: Using Constraint

```rust
#[derive(Accounts)]
pub struct UpdateOwnership<'info> {
    // SECURE: Explicit signer constraint
    #[account(signer)]
    pub owner: UncheckedAccount<'info>,
    #[account(mut, has_one = owner)]
    pub program_account: Account<'info, ProgramAccount>,
}
```

### Anchor: Runtime Check

```rust
pub fn update_ownership(ctx: Context<UpdateOwnership>) -> Result<()> {
    // SECURE: Manual runtime verification
    if !ctx.accounts.owner.is_signer {
        return Err(ProgramError::MissingRequiredSignature.into());
    }

    // Proceed with update...
    Ok(())
}
```

### Pinocchio: Manual Validation

```rust
pub fn process_update(accounts: &[AccountInfo]) -> ProgramResult {
    let owner = &accounts[0];
    let program_account = &accounts[1];

    // SECURE: Explicit signer check
    if !owner.is_signer() {
        return Err(ProgramError::MissingRequiredSignature);
    }

    // Proceed with update...
    Ok(())
}
```

### Pinocchio: TryFrom Pattern

```rust
impl<'a> TryFrom<&'a [AccountInfo]> for UpdateAccounts<'a> {
    type Error = ProgramError;

    fn try_from(accounts: &'a [AccountInfo]) -> Result<Self, Self::Error> {
        let [owner, program_account, ..] = accounts else {
            return Err(ProgramError::NotEnoughAccountKeys);
        };

        // SECURE: Validate signer during account parsing
        if !owner.is_signer() {
            return Err(ProgramError::MissingRequiredSignature);
        }

        Ok(Self { owner, program_account })
    }
}
```

## Detection Checklist

When auditing, look for:

- [ ] `UncheckedAccount` used for authority/owner fields
- [ ] Missing `Signer<'info>` type on authority accounts
- [ ] `has_one` constraint without corresponding signer validation
- [ ] Authority accounts without `#[account(signer)]` constraint
- [ ] Missing `is_signer` / `is_signer()` runtime checks

## Testing for the Vulnerability

```rust
#[test]
fn test_missing_signer_check() {
    // Create transaction WITHOUT signing with owner
    let ix = Instruction {
        program_id,
        accounts: vec![
            AccountMeta::new_readonly(victim_owner, false),  // NOT a signer
            AccountMeta::new(program_account, false),
        ],
        data: UpdateInstruction { new_owner: attacker }.try_to_vec().unwrap(),
    };

    // If this succeeds, vulnerability exists
    let result = process_transaction(&[ix]);
    assert!(result.is_err(), "Should require signature!");
}
```

## Key Takeaways

1. **Always use `Signer<'info>`** for authority accounts in Anchor
2. **Always check `is_signer()`** in Pinocchio before trusting an account
3. **`has_one` is not enough** - it only checks key equality, not signatures
4. **Defense in depth** - combine type constraints with runtime checks
