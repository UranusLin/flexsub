/**
 * FlexSub SDK - Cross-chain Instant Subscription Protocol
 *
 * Integrates: LI.FI (cross-chain) + Yellow (state channels) + Arc (settlement) + CCTP (bridge)
 */

export { FlexSub } from './FlexSub';
export { LiFiIntegration } from './lifi';
export { YellowIntegration } from './yellow';
export { ArcIntegration } from './arc';
export { CCTPIntegration, CCTP_DOMAINS } from './cctp';
export * from './types';
