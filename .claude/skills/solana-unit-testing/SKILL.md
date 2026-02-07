---
name: unit-testing
description: General unit testing patterns for smart contract logic. Use when testing math functions, validation logic, serialization roundtrips, or business logic that doesn't require blockchain state or account context.
---

# /unit-testing

General patterns for unit testing smart contract logic - math functions, validation, serialization, and business logic.

## When to Use

Use this skill when:
- Testing mathematical calculations
- Testing validation logic that doesn't require accounts
- Testing serialization/deserialization roundtrips
- Testing pure functions and business logic
- Testing edge cases and boundary conditions

## Unit Test Location

Unit tests in Rust are placed **inline** with the code they test:

```rust
// In src/math.rs

pub fn calculate_fee(amount: u64, fee_bps: u16) -> Option<u64> {
    (amount as u128)
        .checked_mul(fee_bps as u128)?
        .checked_div(10_000)
        .map(|v| v as u64)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calculate_fee() {
        assert_eq!(calculate_fee(10_000, 100), Some(100));  // 1%
    }
}
```

## Test Organization

### Inline Tests (Preferred for Unit Tests)

```rust
// src/module.rs
pub fn my_function() -> u64 { ... }

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_my_function() { ... }
}
```

### Separate Test Module

```rust
// src/lib.rs
#[cfg(test)]
pub mod test_utils;

// src/test_utils.rs
pub fn create_test_fixture() -> MyType { ... }
```

## Testing Patterns

### 1. Testing Math Functions

```rust
#[cfg(test)]
mod tests {
    use super::*;

    // Test normal cases
    #[test]
    fn test_fee_calculation_normal() {
        assert_eq!(calculate_fee(10_000, 100), Some(100));   // 1%
        assert_eq!(calculate_fee(10_000, 50), Some(50));     // 0.5%
        assert_eq!(calculate_fee(1_000_000, 250), Some(25_000)); // 2.5%
    }

    // Test zero cases
    #[test]
    fn test_fee_calculation_zero() {
        assert_eq!(calculate_fee(0, 100), Some(0));      // Zero amount
        assert_eq!(calculate_fee(10_000, 0), Some(0));   // Zero fee
    }

    // Test boundary cases
    #[test]
    fn test_fee_calculation_boundaries() {
        assert_eq!(calculate_fee(1, 1), Some(0));        // Rounds down
        assert_eq!(calculate_fee(u64::MAX, 1), Some(1844674407370955)); // Large amount
    }

    // Test overflow protection
    #[test]
    fn test_fee_calculation_no_overflow() {
        // Should not panic or return incorrect results
        let result = calculate_fee(u64::MAX, 10_000);
        assert!(result.is_some());
    }
}
```

### 2. Testing Rounding Behavior

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ceiling_division() {
        // Exact division
        assert_eq!(checked_ceil_div(9, 3), Some(3));

        // Rounds up
        assert_eq!(checked_ceil_div(10, 3), Some(4));   // 3.33 -> 4
        assert_eq!(checked_ceil_div(1, 2), Some(1));    // 0.5 -> 1

        // Edge cases
        assert_eq!(checked_ceil_div(0, 5), Some(0));
        assert_eq!(checked_ceil_div(5, 0), None);       // Div by zero
    }

    #[test]
    fn test_floor_division() {
        // Exact division
        assert_eq!(checked_floor_div(9, 3), Some(3));

        // Rounds down
        assert_eq!(checked_floor_div(10, 3), Some(3));  // 3.33 -> 3
        assert_eq!(checked_floor_div(1, 2), Some(0));   // 0.5 -> 0
    }

    #[test]
    fn test_rounding_favors_protocol() {
        let amount = 101u64;
        let fee_bps = 100u16;  // 1%

        // Fee should round UP (protocol receives more)
        let fee = calculate_fee_ceil(amount, fee_bps).unwrap();
        assert_eq!(fee, 2);  // 1.01 -> 2, not 1

        // Withdrawal should round DOWN (user receives less)
        let withdrawal = calculate_withdrawal_floor(amount, fee_bps).unwrap();
        assert_eq!(withdrawal, 99);  // 99.99 -> 99, not 100
    }
}
```

### 3. Testing Checked Arithmetic

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_checked_add() {
        assert_eq!(safe_add(1, 2), Some(3));
        assert_eq!(safe_add(u64::MAX, 0), Some(u64::MAX));
        assert_eq!(safe_add(u64::MAX, 1), None);  // Overflow
    }

    #[test]
    fn test_checked_sub() {
        assert_eq!(safe_sub(5, 3), Some(2));
        assert_eq!(safe_sub(3, 5), None);  // Underflow
        assert_eq!(safe_sub(0, 0), Some(0));
    }

    #[test]
    fn test_checked_mul() {
        assert_eq!(safe_mul(100, 100), Some(10_000));
        assert_eq!(safe_mul(u64::MAX, 2), None);  // Overflow
    }
}
```

### 4. Testing Serialization

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use borsh::{BorshDeserialize, BorshSerialize};

    #[test]
    fn test_account_size_matches_constant() {
        let account = MyAccount {
            field1: 0,
            field2: [0u8; 32].into(),
            field3: MyStatus::Active,
            _padding: [0u8; 64],
        };

        let serialized = account.try_to_vec().unwrap();
        assert_eq!(serialized.len(), MyAccount::LEN, "LEN constant mismatch");
    }

    #[test]
    fn test_serialization_roundtrip() {
        let original = MyAccount {
            field1: 12345,
            field2: [1u8; 32].into(),
            field3: MyStatus::Frozen,
            _padding: [0u8; 64],
        };

        let serialized = original.try_to_vec().unwrap();
        let deserialized = MyAccount::try_from_slice(&serialized).unwrap();

        assert_eq!(original, deserialized);
    }

    #[test]
    fn test_discriminator() {
        assert_eq!(MyAccount::DISCRIMINATOR, 1);
        assert_ne!(MyAccount::DISCRIMINATOR, OtherAccount::DISCRIMINATOR);
    }
}
```

### 5. Testing Enums and Status Values

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_status_transitions() {
        // Valid transitions
        assert!(can_transition(Status::Active, Status::Frozen));
        assert!(can_transition(Status::Frozen, Status::Active));

        // Invalid transitions
        assert!(!can_transition(Status::Active, Status::Active));
    }

    #[test]
    fn test_permission_flags() {
        let permission = Permission {
            can_transfer: true,
            can_freeze: false,
            can_manage: true,
        };

        assert!(permission.allows(Action::Transfer));
        assert!(!permission.allows(Action::Freeze));
        assert!(permission.allows(Action::Manage));
    }
}
```

### 6. Testing Validation Logic

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_amount() {
        assert!(validate_amount(1).is_ok());
        assert!(validate_amount(u64::MAX).is_ok());
        assert!(validate_amount(0).is_err());  // Zero not allowed
    }

    #[test]
    fn test_validate_bps() {
        assert!(validate_bps(0).is_ok());
        assert!(validate_bps(10_000).is_ok());     // 100%
        assert!(validate_bps(10_001).is_err());    // > 100%
    }

    #[test]
    fn test_validate_timestamp() {
        let now = 1704067200;  // Some timestamp

        assert!(validate_timestamp(now, now - 100).is_ok());  // Past
        assert!(validate_timestamp(now, now).is_ok());        // Now
        assert!(validate_timestamp(now, now + 100).is_err()); // Future
    }
}
```

### 7. Testing Time-Based Logic

```rust
#[cfg(test)]
mod tests {
    use super::*;

    const SECONDS_PER_DAY: u64 = 86_400;

    #[test]
    fn test_rate_accrual_one_day() {
        let rate_per_day = 1_000_000;
        let elapsed = SECONDS_PER_DAY;

        let accrued = calculate_accrual(elapsed, rate_per_day, 0);
        assert_eq!(accrued, (1_000_000, 0));  // (increment, remainder)
    }

    #[test]
    fn test_rate_accrual_partial_day() {
        let rate_per_day = 1_000_000;
        let elapsed = SECONDS_PER_DAY / 2;  // Half day

        let (increment, remainder) = calculate_accrual(elapsed, rate_per_day, 0);
        assert_eq!(increment, 500_000);
        assert_eq!(remainder, 0);
    }

    #[test]
    fn test_rate_accrual_with_remainder() {
        let rate_per_day = 1_000_000;
        let elapsed = 100;  // Small time

        let (inc1, rem1) = calculate_accrual(elapsed, rate_per_day, 0);
        let (inc2, rem2) = calculate_accrual(elapsed, rate_per_day, rem1);

        // Remainder should accumulate
        assert!(rem2 > rem1 || inc2 > inc1);
    }

    #[test]
    fn test_safe_elapsed_handles_clock_skew() {
        // Normal case
        assert_eq!(safe_elapsed(100, 50), 50);

        // Clock went backwards (skew protection)
        assert_eq!(safe_elapsed(50, 100), 0);

        // Same timestamp
        assert_eq!(safe_elapsed(100, 100), 0);
    }
}
```

### 8. Testing Hash/Digest Functions

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_config_hash_deterministic() {
        let config = MyConfig { field: 42 };

        let hash1 = config.compute_hash();
        let hash2 = config.compute_hash();

        assert_eq!(hash1, hash2, "Hash must be deterministic");
    }

    #[test]
    fn test_different_configs_different_hash() {
        let config1 = MyConfig { field: 1 };
        let config2 = MyConfig { field: 2 };

        assert_ne!(config1.compute_hash(), config2.compute_hash());
    }

    #[test]
    fn test_hash_collision_resistance() {
        // Similar configs should still have different hashes
        let config1 = MyConfig { data: [0, 0, 0, 1] };
        let config2 = MyConfig { data: [0, 0, 1, 0] };

        assert_ne!(config1.compute_hash(), config2.compute_hash());
    }
}
```

## Test Utilities

### Creating Test Fixtures

```rust
#[cfg(test)]
pub mod test_utils {
    use super::*;

    pub fn create_test_account() -> MyAccount {
        MyAccount {
            id: 1,
            status: Status::Active,
            authority: Pubkey::new_unique(),
            value: 1_000_000,
            _padding: [0u8; 64],
        }
    }

    pub fn create_test_permission(flags: [bool; 5]) -> Permission {
        Permission {
            can_transfer: flags[0],
            can_freeze: flags[1],
            can_manage: flags[2],
            can_reallocate: flags[3],
            can_liquidate: flags[4],
        }
    }

    pub fn random_pubkey() -> Pubkey {
        Pubkey::new_unique()
    }
}
```

### Parameterized Tests with test-case

```rust
use test_case::test_case;

#[test_case(0, 100, 0 ; "zero amount")]
#[test_case(100, 0, 0 ; "zero fee")]
#[test_case(10_000, 100, 100 ; "1% of 10000")]
#[test_case(10_000, 250, 250 ; "2.5% of 10000")]
#[test_case(1, 10_000, 1 ; "100% of 1")]
fn test_fee_calculation(amount: u64, bps: u16, expected: u64) {
    assert_eq!(calculate_fee(amount, bps), Some(expected));
}
```

### Property-Based Assertions

```rust
#[test]
fn test_fee_properties() {
    // Property: fee should never exceed amount
    for amount in [0, 1, 100, 10_000, u64::MAX / 10_000] {
        for bps in [0, 1, 100, 5_000, 10_000] {
            let fee = calculate_fee(amount, bps);
            if let Some(f) = fee {
                assert!(f <= amount, "Fee {} exceeds amount {}", f, amount);
            }
        }
    }
}

#[test]
fn test_roundtrip_property() {
    // Property: serialize then deserialize should equal original
    let test_cases = vec![
        MyAccount { value: 0, ..Default::default() },
        MyAccount { value: u64::MAX, ..Default::default() },
        MyAccount { value: 12345, ..Default::default() },
    ];

    for original in test_cases {
        let bytes = original.try_to_vec().unwrap();
        let restored = MyAccount::try_from_slice(&bytes).unwrap();
        assert_eq!(original, restored);
    }
}
```

## Running Unit Tests

```bash
# Run all unit tests in workspace
cargo test --workspace --lib

# Run tests for specific crate
cargo test -p my-program --lib

# Run specific test
cargo test test_fee_calculation

# Run with output visible
cargo test -- --nocapture

# Run ignored tests
cargo test -- --ignored

# Show test timing
cargo test -- --show-output
```

## Best Practices

1. **Test edge cases** - 0, 1, MAX, boundaries
2. **Test error paths** - Not just success cases
3. **Use descriptive test names** - `test_fee_rounds_up_for_protocol`
4. **Group related tests** - Use nested `mod tests`
5. **Keep tests fast** - No I/O, no network
6. **Test invariants** - Properties that should always hold
7. **Avoid test interdependence** - Each test should be independent

## Related Skills

- `/protocol-math` - Math patterns being tested
- `/litesvm` - Integration testing with LiteSVM
