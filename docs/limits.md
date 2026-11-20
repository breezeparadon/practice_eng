# Free-tier limits (check the provider docs before relying on a number)

| Service | Limit that matters | Source | Checked |
|---|---|---|---|
| Neon Free (via Vercel Storage) | 1 GB storage per project (20 GB account), 100 CU-hours per project per month, 5 GB egress per project per month, scale to zero after 5 min idle (cannot disable; first request after idle is slower). Running out of compute suspends it until the next month. "No credit card required" on Neon's own signup. | neon.com/pricing, neon.com/docs/introduction/plans | 2026-11-20 |
| Neon via Vercel Marketplace on Hobby | Docs do not say whether the Free plan needs a card when installed from Vercel. Pick the Free plan in the install dialog; stop if it asks for billing. | vercel.com/marketplace/neon, neon.com/docs/guides/vercel-native-integration | 2026-11-20 |
| Vercel Hobby | The owner's account already shows "Exceeded free resources" (ISR writes 238K / 200K) from another project. Check Usage before relying on new deploys. | Vercel dashboard | 2026-11-20 |

Wordbook's data (5,392 words, one user's progress) is a few MB, far below the storage limit.
