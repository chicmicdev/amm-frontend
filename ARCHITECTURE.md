src/
├── config/         contracts.ts · tokens.ts · reown.ts
├── types/          index.ts  (Token, Pool, Position, SwapParams, etc.)
├── services/
│   ├── mock/       mockData.ts  (mock pools, positions, swap quotes)
│   └── api/        poolService.ts · positionService.ts  ← swap real calls in here
├── utils/          tickUtils.ts · formatUtils.ts
├── context/        ToastContext.tsx
├── components/
│   ├── common/     TokenInput · TokenSelector (modal) · Toast
│   └── layout/     Header · Layout
└── pages/          SwapPage · PoolPage · PositionsPage
