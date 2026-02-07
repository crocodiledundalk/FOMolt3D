# Type Cosplay

Type cosplay is a critical vulnerability where attackers substitute accounts with identical data structures but different intended purposes. Since Solana stores account data as raw bytes, programs lacking type verification can be deceived into treating a `VaultConfig` as `AdminSettings`.

## Severity: Critical

Successful type cosplay can bypass authorization and access controls entirely.

## The Vulnerability

### Core Issue

When multiple account types share identical layouts (both containing an `owner: Pubkey` field), owner checks and data validation alone are insufficient for distinguishing between them. An attacker controlling one account type can impersonate a completely different account type.

### Vulnerable Pattern (Anchor without Discriminators)

```rust
// Two different account types with SAME layout
#[account]
pub struct UserAccount {
    pub owner: Pubkey,
    pub balance: u64,
}

#[account]
pub struct AdminAccount {
    pub owner: Pubkey,    // Same field!
    pub balance: u64,     // Same field!
}

#[derive(Accounts)]
pub struct AdminAction<'info> {
    pub admin: Signer<'info>,
    // VULNERABLE if deserialized without type check
    #[account(mut, has_one = owner)]  // Only checks owner field
    pub admin_account: Account<'info, AdminAccount>,
}
```

### Vulnerable Pattern (Pinocchio)

```rust
pub fn process_admin_action(accounts: &[AccountInfo]) -> ProgramResult {
    let admin = &accounts[0];
    let admin_account = &accounts[1];

    // VULNERABLE: Only checks signer and owner, not account TYPE
    if !admin.is_signer() {
        return Err(ProgramError::MissingRequiredSignature);
    }

    if !admin_account.is_owned_by(&crate::ID) {
        return Err(ProgramError::IllegalOwner);
    }

    // Deserializes successfully because layouts match!
    let data = admin_account.try_borrow_data()?;
    let state = AdminAccount::from_bytes(&data)?;  // Could actually be UserAccount!

    if !state.owner.eq(admin.key()) {
        return Err(ProgramError::InvalidAccountData);
    }

    // Attacker is now "admin" using their UserAccount
    perform_admin_action()?;

    Ok(())
}
```

## Exploit Scenario

```
Attacker has: UserAccount { owner: Attacker, balance: 100 }

Admin function expects: AdminAccount { owner: Admin, balance: X }

Attack:
1. Attacker creates/controls a UserAccount
2. Sets themselves as owner in UserAccount
3. Calls admin_action with UserAccount instead of AdminAccount
4. Signer check passes (attacker signed)
5. Owner check passes (attacker == UserAccount.owner)
6. Deserialization succeeds (same layout!)
7. Attacker executes admin-only functionality
```

## Secure Implementations

### Anchor: Automatic Discriminators (Recommended)

Anchor automatically adds 8-byte discriminators to accounts marked with `#[account]`:

```rust
#[account]
pub struct UserAccount {
    pub owner: Pubkey,
    pub balance: u64,
}
// Discriminator: sha256("account:UserAccount")[0..8]

#[account]
pub struct AdminAccount {
    pub owner: Pubkey,
    pub balance: u64,
}
// Discriminator: sha256("account:AdminAccount")[0..8]
// DIFFERENT from UserAccount!
```

Using `Account<'info, T>` automatically validates the discriminator:

```rust
#[derive(Accounts)]
pub struct AdminAction<'info> {
    pub admin: Signer<'info>,
    // SECURE: Account<T> checks discriminator automatically
    #[account(mut, has_one = owner)]
    pub admin_account: Account<'info, AdminAccount>,
}
```

### Anchor: Manual Discriminator Check

```rust
pub fn admin_action(ctx: Context<AdminAction>) -> Result<()> {
    // SECURE: Explicit discriminator verification
    let data = ctx.accounts.admin_account.to_account_info().data.borrow();
    let discriminator = &data[..8];

    if discriminator != AdminAccount::DISCRIMINATOR {
        return Err(ErrorCode::InvalidAccountType.into());
    }

    // Proceed with admin action
    Ok(())
}
```

### Pinocchio: Custom Discriminators

```rust
// Define unique discriminators for each type
pub const USER_ACCOUNT_DISCRIMINATOR: u8 = 1;
pub const ADMIN_ACCOUNT_DISCRIMINATOR: u8 = 2;
pub const VAULT_DISCRIMINATOR: u8 = 3;

pub fn process_admin_action(accounts: &[AccountInfo]) -> ProgramResult {
    let admin = &accounts[0];
    let admin_account = &accounts[1];

    if !admin.is_signer() {
        return Err(ProgramError::MissingRequiredSignature);
    }

    if !admin_account.is_owned_by(&crate::ID) {
        return Err(ProgramError::IllegalOwner);
    }

    let data = admin_account.try_borrow_data()?;

    // SECURE: Check discriminator FIRST
    if data[0] != ADMIN_ACCOUNT_DISCRIMINATOR {
        return Err(ProgramError::InvalidAccountData);
    }

    // Now safe to deserialize
    let state = AdminAccount::from_bytes(&data[1..])?;

    if !state.owner.eq(admin.key()) {
        return Err(ProgramError::InvalidAccountData);
    }

    perform_admin_action()?;
    Ok(())
}
```

### Pinocchio: TryFrom with Type Validation

```rust
impl<'a> TryFrom<&'a [AccountInfo]> for AdminAccounts<'a> {
    type Error = ProgramError;

    fn try_from(accounts: &'a [AccountInfo]) -> Result<Self, Self::Error> {
        let [admin, admin_account, ..] = accounts else {
            return Err(ProgramError::NotEnoughAccountKeys);
        };

        if !admin.is_signer() {
            return Err(ProgramError::MissingRequiredSignature);
        }

        if !admin_account.is_owned_by(&crate::ID) {
            return Err(ProgramError::IllegalOwner);
        }

        // SECURE: Type check during parsing
        let data = admin_account.try_borrow_data()?;
        if data[0] != ADMIN_ACCOUNT_DISCRIMINATOR {
            return Err(ProgramError::InvalidAccountData);
        }

        Ok(Self { admin, admin_account })
    }
}
```

## Discriminator Strategies

### 1. Single-Byte Discriminator (Efficient)

```rust
pub const DISCRIMINATORS: [u8; 4] = [
    0,  // Uninitialized
    1,  // UserAccount
    2,  // AdminAccount
    3,  // VaultAccount
];
```

### 2. Multi-Byte Discriminator (More Collision Resistant)

```rust
// First 8 bytes of account data
pub const USER_DISCRIMINATOR: [u8; 8] = [0x55, 0x53, 0x45, 0x52, 0x00, 0x00, 0x00, 0x00];
pub const ADMIN_DISCRIMINATOR: [u8; 8] = [0x41, 0x44, 0x4D, 0x49, 0x4E, 0x00, 0x00, 0x00];
```

### 3. Hash-Based Discriminator (Anchor Style)

```rust
use sha2::{Sha256, Digest};

fn compute_discriminator(account_name: &str) -> [u8; 8] {
    let mut hasher = Sha256::new();
    hasher.update(format!("account:{}", account_name));
    let result = hasher.finalize();
    result[..8].try_into().unwrap()
}
```

## Detection Checklist

When auditing, look for:

- [ ] Multiple account types with identical or similar layouts
- [ ] Deserialization without discriminator checks
- [ ] `UncheckedAccount` deserialized manually
- [ ] Missing `Account<'info, T>` wrapper in Anchor
- [ ] Only owner/signer checks without type validation

## Testing for the Vulnerability

```rust
#[test]
fn test_type_cosplay_attack() {
    // Create a UserAccount controlled by attacker
    let user_account = create_user_account(attacker_pubkey);

    // Try to use UserAccount as AdminAccount
    let result = admin_action(
        attacker_keypair,
        user_account,  // Wrong type!
    );

    // Should fail if protection exists
    assert!(result.is_err(), "Should reject wrong account type!");
}

#[test]
fn test_discriminator_validation() {
    // Create account with wrong discriminator
    let fake_admin = create_account_with_discriminator(
        USER_ACCOUNT_DISCRIMINATOR,  // Wrong!
        AdminAccount { owner: attacker, balance: 0 },
    );

    let result = admin_action(attacker_keypair, fake_admin);
    assert!(result.is_err());
}
```

## Account Layout Comparison

Shows why type cosplay works:

```
UserAccount (without discriminator):
  [0..32]  owner: Pubkey
  [32..40] balance: u64

AdminAccount (without discriminator):
  [0..32]  owner: Pubkey    ← Same offset!
  [32..40] balance: u64     ← Same offset!

UserAccount (WITH discriminator):
  [0]      discriminator: 1
  [1..33]  owner: Pubkey
  [33..41] balance: u64

AdminAccount (WITH discriminator):
  [0]      discriminator: 2  ← DIFFERENT!
  [1..33]  owner: Pubkey
  [33..41] balance: u64
```

## Key Takeaways

1. **Always use discriminators** to distinguish account types
2. **Check discriminator BEFORE deserialization**
3. **Anchor's `Account<T>` handles this automatically**
4. **Same layout ≠ same type** - structure alone doesn't prove type
5. **Single byte is often sufficient** for discriminator
6. **Type cosplay bypasses owner checks** - both accounts are "legitimate"
