# Frontrunning & Initialization Attacks

Frontrunning occurs when attackers observe pending transactions and insert their own transactions ahead to profit. Initialization frontrunning is particularly dangerous, allowing attackers to capture program control.

## Severity: High to Critical

Initialization frontrunning can give attackers permanent admin control. Trading frontrunning causes financial losses through sandwich attacks and slippage exploitation.

## The Vulnerabilities

### 1. Initialization Frontrunning

When programs allow anyone to call initialization, attackers can frontrun legitimate setup to become admin.

```rust
// VULNERABLE: Anyone can initialize and become admin
#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = payer, space = 8 + Config::SIZE)]
    pub config: Account<'info, Config>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
    // VULNERABLE: First caller becomes admin
    ctx.accounts.config.admin = ctx.accounts.payer.key();
    ctx.accounts.config.initialized = true;
    Ok(())
}
```

### 2. Trading Frontrunning (Sandwich Attacks)

Attackers see a large trade, trade ahead of it to move the price, then trade after to profit.

```rust
// VULNERABLE: No slippage protection
pub fn swap(ctx: Context<Swap>, amount_in: u64) -> Result<()> {
    // Calculate output based on current price
    let amount_out = calculate_output(amount_in, pool_reserves)?;

    // VULNERABLE: User receives whatever output is calculated
    // Attacker can manipulate reserves between tx submission and execution
    transfer_tokens(amount_out)?;
    Ok(())
}
```

### 3. Price Manipulation Before Execution

```rust
// VULNERABLE: No expected price check
pub fn buy_nft(ctx: Context<BuyNft>) -> Result<()> {
    let listing = &ctx.accounts.listing;

    // VULNERABLE: Seller can update price after seeing buyer's transaction
    transfer_payment(listing.price)?;
    transfer_nft()?;
    Ok(())
}
```

## Exploit Scenarios

### Initialization Capture

```
Legitimate flow:
  1. Deploy program
  2. Call initialize() to set deployer as admin

Attack:
  1. Attacker monitors mempool for initialize() calls
  2. Attacker sends initialize() with higher priority fee
  3. Attacker's tx executes first, becoming admin
  4. Legitimate initialize() fails (already initialized)
  5. Attacker controls the protocol
```

### Sandwich Attack

```
User wants to swap 10,000 USDC → SOL
Current price: 1 SOL = $100
Expected output: 100 SOL

Sandwich attack:
  1. Attacker sees pending tx in mempool
  2. Attacker front-runs: Buys SOL, price increases to $102
  3. User's tx executes: Gets only 98 SOL instead of 100
  4. Attacker back-runs: Sells SOL at elevated price
  5. Attacker profits ~$200, user loses ~$200
```

### Price Update Attack

```
NFT listed at 10 SOL
Buyer submits purchase tx

Attack:
  1. Seller sees buyer's tx
  2. Seller front-runs: Updates price to 100 SOL
  3. Buyer's tx executes at 100 SOL (10x expected)
  4. Or buyer's tx fails if they don't have enough
```

## Secure Implementations

### Initialization Protection (Anchor)

```rust
use anchor_lang::prelude::*;

declare_id!("...");

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = payer, space = 8 + Config::SIZE)]
    pub config: Account<'info, Config>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
    // SECURE: Only upgrade authority can initialize
    let program_data = get_program_data(&ctx.program_id)?;

    require_keys_eq!(
        ctx.accounts.payer.key(),
        program_data.upgrade_authority_address.unwrap(),
        ErrorCode::UnauthorizedInitializer
    );

    ctx.accounts.config.admin = ctx.accounts.payer.key();
    ctx.accounts.config.initialized = true;
    Ok(())
}

// Helper to get program data account
fn get_program_data(program_id: &Pubkey) -> Result<UpgradeableLoaderState> {
    let (program_data_address, _) = Pubkey::find_program_address(
        &[program_id.as_ref()],
        &bpf_loader_upgradeable::id(),
    );
    // Load and return program data...
}
```

### Initialization with Hardcoded Admin

```rust
// Alternative: Hardcode expected admin
const EXPECTED_ADMIN: Pubkey = pubkey!("Admin111111111111111111111111111111111111111");

pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
    // SECURE: Only hardcoded admin can initialize
    require_keys_eq!(
        ctx.accounts.payer.key(),
        EXPECTED_ADMIN,
        ErrorCode::UnauthorizedInitializer
    );

    ctx.accounts.config.admin = ctx.accounts.payer.key();
    Ok(())
}
```

### Slippage Protection (Anchor)

```rust
#[derive(Accounts)]
pub struct Swap<'info> {
    pub user: Signer<'info>,
    #[account(mut)]
    pub user_token_in: Account<'info, TokenAccount>,
    #[account(mut)]
    pub user_token_out: Account<'info, TokenAccount>,
    #[account(mut)]
    pub pool: Account<'info, Pool>,
    pub token_program: Program<'info, Token>,
}

pub fn swap(
    ctx: Context<Swap>,
    amount_in: u64,
    minimum_amount_out: u64,  // SECURE: User specifies minimum acceptable output
) -> Result<()> {
    let amount_out = calculate_output(
        amount_in,
        ctx.accounts.pool.reserve_in,
        ctx.accounts.pool.reserve_out,
    )?;

    // SECURE: Reject if output is less than user's minimum
    require!(
        amount_out >= minimum_amount_out,
        ErrorCode::SlippageExceeded
    );

    // Execute swap
    perform_swap(ctx, amount_in, amount_out)?;
    Ok(())
}
```

### Expected Price Check (Anchor)

```rust
pub fn buy_nft(
    ctx: Context<BuyNft>,
    expected_price: u64,  // SECURE: User specifies expected price
) -> Result<()> {
    let listing = &ctx.accounts.listing;

    // SECURE: Reject if price changed
    require!(
        listing.price == expected_price,
        ErrorCode::PriceChanged
    );

    transfer_payment(listing.price)?;
    transfer_nft()?;
    Ok(())
}
```

### Deadline Protection

```rust
pub fn swap_with_deadline(
    ctx: Context<Swap>,
    amount_in: u64,
    minimum_amount_out: u64,
    deadline: i64,  // SECURE: Transaction expires after deadline
) -> Result<()> {
    let clock = Clock::get()?;

    // SECURE: Reject stale transactions
    require!(
        clock.unix_timestamp <= deadline,
        ErrorCode::TransactionExpired
    );

    // Continue with slippage-protected swap
    // ...
}
```

### Pinocchio: Slippage Protection

```rust
pub fn process_swap(
    accounts: &[AccountInfo],
    amount_in: u64,
    minimum_amount_out: u64,
    deadline: i64,
) -> ProgramResult {
    let clock = Clock::get()?;

    // SECURE: Check deadline
    if clock.unix_timestamp > deadline {
        return Err(ProgramError::Custom(1));  // Expired
    }

    // Calculate output
    let amount_out = calculate_output(amount_in)?;

    // SECURE: Check slippage
    if amount_out < minimum_amount_out {
        return Err(ProgramError::Custom(2));  // Slippage exceeded
    }

    // Execute swap
    Ok(())
}
```

### Two-Step Initialization

```rust
// Step 1: Deployer nominates admin during deployment
#[account]
pub struct Config {
    pub pending_admin: Pubkey,
    pub admin: Pubkey,
    pub initialized: bool,
}

// Step 2: Nominated admin must accept
pub fn accept_admin(ctx: Context<AcceptAdmin>) -> Result<()> {
    // SECURE: Only pending admin can accept
    require_keys_eq!(
        ctx.accounts.signer.key(),
        ctx.accounts.config.pending_admin,
        ErrorCode::NotPendingAdmin
    );

    ctx.accounts.config.admin = ctx.accounts.signer.key();
    ctx.accounts.config.pending_admin = Pubkey::default();
    Ok(())
}
```

## Commit-Reveal Pattern

For highly sensitive operations, use commit-reveal to hide intent:

```rust
#[account]
pub struct Commitment {
    pub user: Pubkey,
    pub commitment_hash: [u8; 32],
    pub committed_at: i64,
}

// Step 1: User commits hash of their action
pub fn commit(ctx: Context<Commit>, commitment_hash: [u8; 32]) -> Result<()> {
    ctx.accounts.commitment.user = ctx.accounts.user.key();
    ctx.accounts.commitment.commitment_hash = commitment_hash;
    ctx.accounts.commitment.committed_at = Clock::get()?.unix_timestamp;
    Ok(())
}

// Step 2: User reveals action (must wait minimum time)
pub fn reveal(
    ctx: Context<Reveal>,
    action: Action,
    nonce: [u8; 32],
) -> Result<()> {
    let clock = Clock::get()?;

    // SECURE: Must wait minimum time (prevents same-block reveal)
    require!(
        clock.unix_timestamp >= ctx.accounts.commitment.committed_at + MIN_COMMIT_DELAY,
        ErrorCode::RevealTooEarly
    );

    // SECURE: Verify commitment matches
    let expected_hash = hash(&[&action.try_to_vec()?, &nonce].concat());
    require!(
        expected_hash.to_bytes() == ctx.accounts.commitment.commitment_hash,
        ErrorCode::InvalidReveal
    );

    // Execute action
    execute_action(action)?;
    Ok(())
}
```

## Detection Checklist

When auditing, look for:

- [ ] Initialize functions callable by anyone
- [ ] Missing upgrade_authority check for initialization
- [ ] Swap functions without minimum_amount_out parameter
- [ ] Purchase functions without expected_price parameter
- [ ] Missing deadline parameters for time-sensitive operations
- [ ] Price reads without staleness protection
- [ ] Single-step admin setup (instead of two-step)

## Best Practices

### 1. Protect Initialization

```rust
// Check upgrade authority
require_keys_eq!(signer.key(), program_data.upgrade_authority);

// Or use hardcoded admin
require_keys_eq!(signer.key(), HARDCODED_ADMIN);
```

### 2. Always Require Slippage Tolerance

```rust
pub fn swap(amount_in: u64, min_amount_out: u64) -> Result<()> {
    require!(actual_out >= min_amount_out);
}
```

### 3. Use Deadlines for Time-Sensitive Operations

```rust
pub fn action(deadline: i64) -> Result<()> {
    require!(Clock::get()?.unix_timestamp <= deadline);
}
```

### 4. Require Expected Values for Purchases

```rust
pub fn buy(expected_price: u64) -> Result<()> {
    require!(actual_price == expected_price);
}
```

### 5. Consider Commit-Reveal for High-Value Operations

```rust
// Commit hash, wait, then reveal
// Prevents attackers from seeing and front-running
```

## Key Takeaways

1. **Initialization frontrunning gives attackers permanent control** - protect with authority checks
2. **Always include slippage protection** (minimum_amount_out) for swaps
3. **Include expected_price** for purchases to prevent price manipulation
4. **Use deadlines** to prevent stale transaction execution
5. **Consider two-step processes** for admin transfers
6. **Commit-reveal** provides strongest protection for high-value operations
7. **Solana's fast finality reduces but doesn't eliminate** frontrunning risk

## Sources

- [Cantina - Securing Solana](https://cantina.xyz/blog/securing-solana-a-developers-guide)
- [SlowMist - Solana Smart Contract Security](https://github.com/slowmist/solana-smart-contract-security-best-practices)
- [ScaleBit - Solana Security Practices](https://www.scalebit.xyz/blog/post/best-solana-security-practices-guide.html)
