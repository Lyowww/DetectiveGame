# CASEFILE visual assets

Portraits and cover images in `public/portraits` and `public/covers` are downloaded from [Unsplash](https://unsplash.com) under the [Unsplash License](https://unsplash.com/license). They are fictional stand-ins for game characters, not likenesses of named people, and are stable files in the repository so screens do not swap faces between sessions.

## Pipeline

1. Choose a licensed still (Unsplash / Pexels / authored art).
2. Crop to 640×800 (portraits) or 1200×675 (covers).
3. Save as `/public/portraits/<characterId>.jpg` or `/public/covers/<caseId>.jpg`.
4. Set `portrait` / `coverImage` on the case definition.
5. Never put provider API keys in the client. Do not regenerate portraits at runtime.

When a facial detail is a clue, author and verify the asset yourself. Stock faces are atmosphere only and must not encode the solution.
