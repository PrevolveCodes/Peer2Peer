// Channel messages are handled by js/big-update.js.
// This file intentionally does not attach another channel click/send handler.
// The previous version used rooms/<code>/messages with channelId, which conflicted
// with the real channel storage at rooms/<code>/channels/<channel>/messages.
// Keeping a second handler here caused the channel sidebar to open the old
// group-wide chat and made messages appear to belong to every channel.
