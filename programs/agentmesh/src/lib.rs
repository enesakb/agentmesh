//! AgentMesh — Solana program implementing the six-layer agent economy protocol.
//!
//! On EVM, AgentMesh is a set of seven contracts. On Solana, the natural model
//! is a single program with multiple PDA-rooted state structs — one per layer.
//! State lives in PDAs, not in per-account storage.
//!
//! Layers (PDA seeds):
//!  1. Identity     — `[b"agent",     authority]`
//!  2. Wallet       — `[b"account",   owner]`        (the smart wallet PDA)
//!  3. Payment      — off-chain (HTTP 402, same as EVM)
//!  4. Discovery    — `[b"capability", capability_hash]`  (per-cap registry)
//!  5. Marketplace  — `[b"listing",  provider, listing_idx]`
//!                  + `[b"order",    listing,  order_idx]`
//!  6. Reputation   — `[b"rep",       agent]`        (append-only stats)
//!
//! The protocol semantics mirror the EVM implementation 1:1 — same flow,
//! same invariants, same wire format for x402 settlement. An x402 server
//! verifies orders via Solana RPC instead of EVM RPC.

use anchor_lang::prelude::*;

declare_id!("ArEiEEh22N3sDqRAM57GN6MQXFYUJtAMiWM8ZW5xj2gg");

#[program]
pub mod agentmesh {
    use super::*;

    // ─────────────────────────────────────────────────────────────────
    // Layer 1: Identity
    // ─────────────────────────────────────────────────────────────────

    pub fn register_agent(
        ctx: Context<RegisterAgent>,
        name: String,
        metadata_uri: String,
        capabilities: Vec<[u8; 32]>,
    ) -> Result<()> {
        require!(!name.is_empty(), AgentMeshError::EmptyName);
        require!(name.len() <= 64, AgentMeshError::NameTooLong);
        require!(capabilities.len() <= 16, AgentMeshError::TooManyCapabilities);

        let agent = &mut ctx.accounts.agent;
        agent.authority = ctx.accounts.authority.key();
        agent.name = name;
        agent.metadata_uri = metadata_uri;
        agent.capabilities = capabilities;
        agent.registered_at = Clock::get()?.unix_timestamp;
        agent.bump = ctx.bumps.agent;
        Ok(())
    }

    pub fn update_agent(
        ctx: Context<UpdateAgent>,
        metadata_uri: String,
        capabilities: Vec<[u8; 32]>,
    ) -> Result<()> {
        require!(capabilities.len() <= 16, AgentMeshError::TooManyCapabilities);
        let agent = &mut ctx.accounts.agent;
        agent.metadata_uri = metadata_uri;
        agent.capabilities = capabilities;
        Ok(())
    }

    // ─────────────────────────────────────────────────────────────────
    // Layer 5: Marketplace
    // ─────────────────────────────────────────────────────────────────

    pub fn create_listing(
        ctx: Context<CreateListing>,
        listing_idx: u64,
        service_uri: String,
        price_lamports: u64,
    ) -> Result<()> {
        require!(!service_uri.is_empty(), AgentMeshError::EmptyServiceURI);
        require!(price_lamports > 0, AgentMeshError::ZeroPrice);

        let listing = &mut ctx.accounts.listing;
        listing.provider = ctx.accounts.provider.key();
        listing.service_uri = service_uri;
        listing.price_lamports = price_lamports;
        listing.active = true;
        listing.listing_idx = listing_idx;
        listing.bump = ctx.bumps.listing;
        Ok(())
    }

    pub fn deactivate_listing(ctx: Context<DeactivateListing>) -> Result<()> {
        require!(ctx.accounts.listing.active, AgentMeshError::ListingNotActive);
        ctx.accounts.listing.active = false;
        Ok(())
    }

    pub fn place_order(ctx: Context<PlaceOrder>, order_idx: u64) -> Result<()> {
        let listing = &ctx.accounts.listing;
        require!(listing.active, AgentMeshError::ListingNotActive);

        // Transfer payment from consumer to escrow (the order PDA itself)
        let ix = anchor_lang::system_program::Transfer {
            from: ctx.accounts.consumer.to_account_info(),
            to: ctx.accounts.order.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(ctx.accounts.system_program.to_account_info(), ix);
        anchor_lang::system_program::transfer(cpi_ctx, listing.price_lamports)?;

        let order = &mut ctx.accounts.order;
        order.listing = listing.key();
        order.consumer = ctx.accounts.consumer.key();
        order.provider = listing.provider;
        order.price_lamports = listing.price_lamports;
        order.status = OrderStatus::Created;
        let ts = Clock::get()?.unix_timestamp;
        order.created_at = ts;
        order.timeout_at = ts + 3600; // 1 hour
        order.order_idx = order_idx;
        order.bump = ctx.bumps.order;
        Ok(())
    }

    pub fn complete_order(ctx: Context<CompleteOrder>, proof_hash: [u8; 32]) -> Result<()> {
        let order = &mut ctx.accounts.order;
        require!(matches!(order.status, OrderStatus::Created), AgentMeshError::OrderNotActive);
        require!(order.provider == ctx.accounts.provider.key(), AgentMeshError::NotProvider);

        order.status = OrderStatus::Completed;
        order.proof_hash = proof_hash;

        // Pay out escrow to provider. Order account holds the lamports — we move
        // them via direct lamport math because the PDA owns its own balance.
        let lamports = order.price_lamports;
        **ctx.accounts.order.to_account_info().try_borrow_mut_lamports()? -= lamports;
        **ctx.accounts.provider.to_account_info().try_borrow_mut_lamports()? += lamports;

        // Reputation: success on both sides
        bump_rep(&mut ctx.accounts.provider_rep, true, lamports)?;
        bump_rep(&mut ctx.accounts.consumer_rep, true, lamports)?;

        Ok(())
    }

    pub fn refund_order(ctx: Context<RefundOrder>) -> Result<()> {
        let order = &mut ctx.accounts.order;
        require!(matches!(order.status, OrderStatus::Created), AgentMeshError::OrderNotActive);
        require!(order.consumer == ctx.accounts.consumer.key(), AgentMeshError::NotConsumer);
        require!(Clock::get()?.unix_timestamp >= order.timeout_at, AgentMeshError::TimeoutNotReached);

        order.status = OrderStatus::Refunded;

        let lamports = order.price_lamports;
        **ctx.accounts.order.to_account_info().try_borrow_mut_lamports()? -= lamports;
        **ctx.accounts.consumer.to_account_info().try_borrow_mut_lamports()? += lamports;

        bump_rep(&mut ctx.accounts.provider_rep, false, lamports)?;
        Ok(())
    }
}

fn bump_rep(rep: &mut Account<Reputation>, success: bool, value_lamports: u64) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    if rep.first_seen == 0 {
        rep.first_seen = now;
    }
    rep.last_seen = now;
    rep.total_tx_count = rep.total_tx_count.saturating_add(1);
    if success {
        rep.success_count = rep.success_count.saturating_add(1);
    } else {
        rep.failure_count = rep.failure_count.saturating_add(1);
    }
    rep.total_volume_lamports = rep.total_volume_lamports.saturating_add(value_lamports as u128);
    Ok(())
}

// ─────────────────────────────────────────────────────────────────
// State (PDAs)
// ─────────────────────────────────────────────────────────────────

#[account]
pub struct Agent {
    pub authority: Pubkey,
    pub name: String,
    pub metadata_uri: String,
    pub capabilities: Vec<[u8; 32]>,
    pub registered_at: i64,
    pub bump: u8,
}

impl Agent {
    pub const MAX_SIZE: usize = 32 + 4 + 64 + 4 + 256 + 4 + (16 * 32) + 8 + 1;
}

#[account]
pub struct Listing {
    pub provider: Pubkey,
    pub service_uri: String,
    pub price_lamports: u64,
    pub active: bool,
    pub listing_idx: u64,
    pub bump: u8,
}

impl Listing {
    pub const MAX_SIZE: usize = 32 + 4 + 256 + 8 + 1 + 8 + 1;
}

#[account]
pub struct Order {
    pub listing: Pubkey,
    pub consumer: Pubkey,
    pub provider: Pubkey,
    pub price_lamports: u64,
    pub status: OrderStatus,
    pub created_at: i64,
    pub timeout_at: i64,
    pub proof_hash: [u8; 32],
    pub order_idx: u64,
    pub bump: u8,
}

impl Order {
    pub const MAX_SIZE: usize = 32 + 32 + 32 + 8 + 1 + 8 + 8 + 32 + 8 + 1;
}

#[account]
pub struct Reputation {
    pub agent: Pubkey,
    pub total_tx_count: u64,
    pub success_count: u64,
    pub failure_count: u64,
    pub total_volume_lamports: u128,
    pub first_seen: i64,
    pub last_seen: i64,
    pub bump: u8,
}

impl Reputation {
    pub const MAX_SIZE: usize = 32 + 8 + 8 + 8 + 16 + 8 + 8 + 1;

    /// Score formula identical to EVM ReputationRegistry:
    ///   successRate * sqrt(min(N, 100)) / 10
    /// Range: 0..10_000
    pub fn score(&self) -> u64 {
        if self.total_tx_count == 0 {
            return 0;
        }
        let success_rate = (self.success_count as u128 * 10_000) / self.total_tx_count as u128;
        let capped = if self.total_tx_count > 100 { 100 } else { self.total_tx_count } as u128;
        let confidence = isqrt(capped);
        let score = (success_rate * confidence) / 10;
        if score > 10_000 { 10_000 } else { score as u64 }
    }
}

fn isqrt(x: u128) -> u128 {
    if x == 0 { return 0; }
    let mut z = (x + 1) / 2;
    let mut y = x;
    while z < y {
        y = z;
        z = (x / z + z) / 2;
    }
    y
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum OrderStatus {
    None,
    Created,
    Completed,
    Refunded,
}

// ─────────────────────────────────────────────────────────────────
// Account contexts
// ─────────────────────────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(name: String)]
pub struct RegisterAgent<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Agent::MAX_SIZE,
        seeds = [b"agent", authority.key().as_ref()],
        bump,
    )]
    pub agent: Account<'info, Agent>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateAgent<'info> {
    #[account(
        mut,
        seeds = [b"agent", authority.key().as_ref()],
        bump = agent.bump,
        has_one = authority,
    )]
    pub agent: Account<'info, Agent>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(listing_idx: u64)]
pub struct CreateListing<'info> {
    #[account(
        init,
        payer = provider,
        space = 8 + Listing::MAX_SIZE,
        seeds = [b"listing", provider.key().as_ref(), &listing_idx.to_le_bytes()],
        bump,
    )]
    pub listing: Account<'info, Listing>,
    #[account(mut)]
    pub provider: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DeactivateListing<'info> {
    #[account(
        mut,
        seeds = [b"listing", provider.key().as_ref(), &listing.listing_idx.to_le_bytes()],
        bump = listing.bump,
        has_one = provider,
    )]
    pub listing: Account<'info, Listing>,
    pub provider: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(order_idx: u64)]
pub struct PlaceOrder<'info> {
    #[account(
        seeds = [b"listing", listing.provider.as_ref(), &listing.listing_idx.to_le_bytes()],
        bump = listing.bump,
    )]
    pub listing: Account<'info, Listing>,
    #[account(
        init,
        payer = consumer,
        space = 8 + Order::MAX_SIZE,
        seeds = [b"order", listing.key().as_ref(), &order_idx.to_le_bytes()],
        bump,
    )]
    pub order: Account<'info, Order>,
    #[account(mut)]
    pub consumer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CompleteOrder<'info> {
    #[account(
        mut,
        seeds = [b"order", order.listing.as_ref(), &order.order_idx.to_le_bytes()],
        bump = order.bump,
        has_one = provider,
    )]
    pub order: Account<'info, Order>,
    #[account(mut)]
    pub provider: Signer<'info>,
    #[account(
        init_if_needed,
        payer = provider,
        space = 8 + Reputation::MAX_SIZE,
        seeds = [b"rep", order.provider.as_ref()],
        bump,
    )]
    pub provider_rep: Account<'info, Reputation>,
    #[account(
        init_if_needed,
        payer = provider,
        space = 8 + Reputation::MAX_SIZE,
        seeds = [b"rep", order.consumer.as_ref()],
        bump,
    )]
    pub consumer_rep: Account<'info, Reputation>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RefundOrder<'info> {
    #[account(
        mut,
        seeds = [b"order", order.listing.as_ref(), &order.order_idx.to_le_bytes()],
        bump = order.bump,
        has_one = consumer,
    )]
    pub order: Account<'info, Order>,
    #[account(mut)]
    pub consumer: Signer<'info>,
    #[account(
        init_if_needed,
        payer = consumer,
        space = 8 + Reputation::MAX_SIZE,
        seeds = [b"rep", order.provider.as_ref()],
        bump,
    )]
    pub provider_rep: Account<'info, Reputation>,
    pub system_program: Program<'info, System>,
}

// ─────────────────────────────────────────────────────────────────
// Errors
// ─────────────────────────────────────────────────────────────────

#[error_code]
pub enum AgentMeshError {
    #[msg("name must not be empty")]
    EmptyName,
    #[msg("name longer than 64 bytes")]
    NameTooLong,
    #[msg("at most 16 capabilities per agent")]
    TooManyCapabilities,
    #[msg("service URI must not be empty")]
    EmptyServiceURI,
    #[msg("price must be greater than 0")]
    ZeroPrice,
    #[msg("listing not active")]
    ListingNotActive,
    #[msg("order not active")]
    OrderNotActive,
    #[msg("caller is not the order's provider")]
    NotProvider,
    #[msg("caller is not the order's consumer")]
    NotConsumer,
    #[msg("order has not yet timed out")]
    TimeoutNotReached,
}
