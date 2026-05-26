# ghostnet-ai

## Dashboard scaffold

The frontend shell lives in the Next.js app router and renders the dashboard at `/dashboard` with the live threat table at `/dashboard/threats`.

The threats page is wired to the mock response in `docs/samples/live-threats.json` so backend routes can be aligned against the same fixture shape during integration.
