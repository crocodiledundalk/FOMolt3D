# Oracle Validation

Price oracles provide external data (token prices, exchange rates) to on-chain programs. Without proper validation, attackers can exploit stale prices, manipulated feeds, or fake oracle accounts to drain funds.

## Severity: Critical

Oracle manipulation has caused hundreds of millions in losses across DeFi. Invalid price data leads to incorrect liquidations, arbitrage opportunities, and fund drainage.

## The Vulnerability

### Core Issue

Programs often trust oracle data without validating:
1. **Oracle account authenticity** - Is this the real oracle?
2. **Price feed status** - Is the price currently valid?
3. **Price staleness** - Is the data recent enough?
4. **Price confidence** - Is the price reliable?

### Vulnerable Pattern (Anchor)

```rust
#[derive(Accounts)]
pub struct Liquidate<'info> {
    pub liquidator: Signer<'info>,
    #[account(mut)]
    pub position: Account<'info, Position>,
    // VULNERABLE: No validation of oracle account
    /// CHECK: Price oracle
    pub price_oracle: UncheckedAccount<'info>,
}

pub fn liquidate(ctx: Context<Liquidate>) -> Result<()> {
    // VULNERABLE: Deserializing unvalidated oracle
    let price_feed = load_price_feed(&ctx.accounts.price_oracle)?;

    // VULNERABLE: Using price without status check
    let price = price_feed.get_price_unchecked();

    // VULNERABLE: No staleness check
    let position_value = ctx.accounts.position.collateral * price.price;

    if position_value < ctx.accounts.position.debt {
        // Liquidate based on potentially manipulated/stale price!
        perform_liquidation(...)?;
    }

    Ok(())
}
```

### Vulnerable Pattern (Pinocchio)

```rust
pub fn process_liquidate(accounts: &[AccountInfo]) -> ProgramResult {
    let liquidator = &accounts[0];
    let position = &accounts[1];
    let price_oracle = &accounts[2];  // VULNERABLE: Unvalidated

    // VULNERABLE: No oracle address verification
    let oracle_data = price_oracle.try_borrow_data()?;

    // VULNERABLE: No status check - price could be invalid
    let price = i64::from_le_bytes(oracle_data[0..8].try_into().unwrap());

    // Liquidation based on unvalidated price
    // ...
}
```

## Exploit Scenarios

### Fake Oracle Attack

```
Attacker deploys fake oracle account with manipulated price.

Real SOL price: $100
Fake oracle price: $1

Attack:
1. Attacker has position: 10 SOL collateral, $500 debt
2. At real price: $1000 collateral > $500 debt (healthy)
3. At fake price: $10 collateral < $500 debt (liquidatable!)
4. Attacker liquidates their own position at fake price
5. Profit from the manipulated liquidation
```

### Stale Price Attack

```
Oracle hasn't updated in 1 hour.

1 hour ago: SOL = $100
Current: SOL = $80 (market crashed)

Attack using stale $100 price:
1. Attacker borrows maximum against SOL at stale $100
2. Real value is only $80
3. Protocol is undercollateralized
4. Attacker extracts value before price updates
```

### Invalid Status Attack

```
Oracle status: "Halted" or "Unknown" (price unreliable)
Protocol ignores status, uses last known price.

Attacker exploits the unreliable price for arbitrage.
```

## Secure Implementations

### Pyth Oracle Validation (Anchor)

```rust
use pyth_sdk_solana::{load_price_feed_from_account_info, Price, PriceFeed};

#[derive(Accounts)]
pub struct SecureLiquidate<'info> {
    pub liquidator: Signer<'info>,
    #[account(mut)]
    pub position: Account<'info, Position>,
    /// CHECK: Validated in instruction
    pub price_oracle: UncheckedAccount<'info>,
}

pub fn liquidate(ctx: Context<SecureLiquidate>) -> Result<()> {
    // SECURE: Validate oracle account address against known feed
    let expected_feed = get_expected_price_feed(&ctx.accounts.position.asset)?;
    require_keys_eq!(
        ctx.accounts.price_oracle.key(),
        expected_feed,
        ErrorCode::InvalidOracle
    );

    // SECURE: Load price feed with validation
    let price_feed = load_price_feed_from_account_info(&ctx.accounts.price_oracle)
        .map_err(|_| ErrorCode::InvalidPriceFeed)?;

    // SECURE: Get current price with status check
    let clock = Clock::get()?;
    let current_price = price_feed
        .get_price_no_older_than(clock.unix_timestamp, MAX_PRICE_AGE_SECONDS)
        .ok_or(ErrorCode::StalePriceData)?;

    // SECURE: Check price confidence
    let confidence_ratio = current_price.conf as f64 / current_price.price as f64;
    if confidence_ratio > MAX_CONFIDENCE_RATIO {
        return Err(ErrorCode::PriceConfidenceTooLow.into());
    }

    // Now safe to use price
    let price_with_expo = current_price.price as i128 * 10i128.pow((-current_price.expo) as u32);
    // ...
}

// Configuration
const MAX_PRICE_AGE_SECONDS: i64 = 60;  // 1 minute
const MAX_CONFIDENCE_RATIO: f64 = 0.05;  // 5% confidence interval
```

### Pyth Oracle Validation (Pinocchio)

```rust
use pyth_sdk_solana::{load_price_feed_from_account_info, state::PriceStatus};

pub fn process_liquidate(accounts: &[AccountInfo]) -> ProgramResult {
    let liquidator = &accounts[0];
    let position = &accounts[1];
    let price_oracle = &accounts[2];

    // SECURE: Validate oracle address
    let expected_oracle = get_expected_oracle_address()?;
    if !price_oracle.key().eq(&expected_oracle) {
        return Err(ProgramError::InvalidArgument);
    }

    // SECURE: Load and validate price feed
    let price_feed = load_price_feed_from_account_info(price_oracle)
        .map_err(|_| ProgramError::InvalidAccountData)?;

    let price = price_feed.get_current_price()
        .ok_or(ProgramError::InvalidAccountData)?;

    // SECURE: Check price status
    if price_feed.status != PriceStatus::Trading {
        return Err(ProgramError::InvalidAccountData);  // Price not reliable
    }

    // SECURE: Check staleness
    let clock = Clock::get()?;
    let price_age = clock.unix_timestamp - price_feed.timestamp;
    if price_age > MAX_PRICE_AGE {
        return Err(ProgramError::InvalidAccountData);  // Price too old
    }

    // SECURE: Check confidence interval
    if price.conf > price.price / 20 {  // 5% threshold
        return Err(ProgramError::InvalidAccountData);  // Price too uncertain
    }

    // Now safe to use
    Ok(())
}
```

### Switchboard Oracle Validation

```rust
use switchboard_v2::AggregatorAccountData;

pub fn validate_switchboard_oracle(
    oracle_account: &AccountInfo,
    expected_oracle: Pubkey,
    max_staleness: i64,
) -> Result<f64> {
    // SECURE: Validate oracle address
    require_keys_eq!(oracle_account.key(), expected_oracle, ErrorCode::InvalidOracle);

    // SECURE: Load aggregator data
    let feed = AggregatorAccountData::new(oracle_account)
        .map_err(|_| ErrorCode::InvalidOracleAccount)?;

    // SECURE: Check staleness
    let clock = Clock::get()?;
    let staleness = clock.unix_timestamp - feed.latest_confirmed_round.round_open_timestamp;
    if staleness > max_staleness {
        return Err(ErrorCode::StalePriceData.into());
    }

    // SECURE: Check result validity
    let result = feed.get_result()
        .map_err(|_| ErrorCode::InvalidOracleResult)?;

    // SECURE: Check variance (confidence)
    if feed.latest_confirmed_round.std_deviation > MAX_ALLOWED_VARIANCE {
        return Err(ErrorCode::PriceVarianceTooHigh.into());
    }

    Ok(result.try_into().unwrap())
}
```

### Multi-Oracle Pattern

```rust
pub fn get_validated_price(
    primary_oracle: &AccountInfo,
    secondary_oracle: &AccountInfo,
) -> Result<u64> {
    // Get prices from both oracles
    let primary_price = get_oracle_price(primary_oracle)?;
    let secondary_price = get_oracle_price(secondary_oracle)?;

    // SECURE: Check prices are within tolerance
    let deviation = if primary_price > secondary_price {
        (primary_price - secondary_price) * 100 / primary_price
    } else {
        (secondary_price - primary_price) * 100 / secondary_price
    };

    if deviation > MAX_ORACLE_DEVIATION_PERCENT {
        return Err(ErrorCode::OraclePriceMismatch.into());
    }

    // Use average or median
    Ok((primary_price + secondary_price) / 2)
}
```

## Validation Checklist

For every oracle usage, verify:

- [ ] **Address validation** - Is this the expected oracle account?
- [ ] **Owner validation** - Is it owned by the oracle program?
- [ ] **Status check** - Is the price feed in "Trading" status?
- [ ] **Staleness check** - Is the price recent enough?
- [ ] **Confidence check** - Is the price confidence acceptable?
- [ ] **Sanity bounds** - Is the price within reasonable range?

## Oracle Configuration

```rust
#[account]
pub struct OracleConfig {
    /// Expected oracle account address
    pub oracle_address: Pubkey,
    /// Maximum age in seconds before price is stale
    pub max_staleness: i64,
    /// Maximum allowed confidence interval (basis points)
    pub max_confidence_bps: u64,
    /// Minimum valid price (sanity check)
    pub min_price: u64,
    /// Maximum valid price (sanity check)
    pub max_price: u64,
}

pub fn validate_price(config: &OracleConfig, price: &Price) -> Result<()> {
    // Staleness
    let clock = Clock::get()?;
    if clock.unix_timestamp - price.publish_time > config.max_staleness {
        return Err(ErrorCode::StalePrice.into());
    }

    // Confidence
    let confidence_bps = (price.conf * 10000) / price.price as u64;
    if confidence_bps > config.max_confidence_bps {
        return Err(ErrorCode::LowConfidence.into());
    }

    // Sanity bounds
    if price.price < config.min_price as i64 || price.price > config.max_price as i64 {
        return Err(ErrorCode::PriceOutOfBounds.into());
    }

    Ok(())
}
```

## Detection Checklist

When auditing, look for:

- [ ] Oracle accounts used without address validation
- [ ] Price used without status check (`get_price_unchecked`)
- [ ] Missing staleness validation
- [ ] Missing confidence interval check
- [ ] Single oracle dependency (no fallback)
- [ ] No sanity bounds on prices
- [ ] Hardcoded oracle addresses that can't be updated

## Best Practices

### 1. Always Validate Oracle Address

```rust
require_keys_eq!(oracle.key(), config.expected_oracle);
```

### 2. Always Check Price Validity

```rust
// Pyth
let price = feed.get_price_no_older_than(timestamp, max_age)?;

// Or check status explicitly
require!(feed.status == PriceStatus::Trading);
```

### 3. Use Appropriate Staleness Thresholds

```rust
// High-frequency trading: 10-30 seconds
// DeFi lending: 60-300 seconds
// Less time-sensitive: 300-900 seconds
```

### 4. Consider Multi-Oracle Designs

```rust
// Use multiple oracles for critical operations
// Require prices to be within tolerance
// Have fallback if primary fails
```

### 5. Add Circuit Breakers

```rust
// Pause operations if price moves too fast
if price_change_percent > CIRCUIT_BREAKER_THRESHOLD {
    return Err(ErrorCode::CircuitBreakerTriggered);
}
```

## Key Takeaways

1. **Always validate oracle account address** against known expected address
2. **Check price status** - don't use prices when oracle is halted/unknown
3. **Check price staleness** - old prices can be manipulated against
4. **Check confidence intervals** - wide intervals indicate unreliable data
5. **Add sanity bounds** - reject prices outside reasonable range
6. **Consider multi-oracle** - reduces single point of failure
7. **Make oracle addresses configurable** - allows updates without upgrade

## Sources

- [SlowMist - Solana Smart Contract Security](https://github.com/slowmist/solana-smart-contract-security-best-practices)
- [Pyth Network Documentation](https://docs.pyth.network/price-feeds/best-practices)
- [Mango Markets Exploit Analysis](https://blog.chain.link/defi-security-best-practices/)
