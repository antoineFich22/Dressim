require('dotenv').config();
const { app } = require('./app');

const PORT = process.env.PORT || 3000;
const MOCK_MODE = process.env.MOCK_MODE === 'true' || !process.env.FASHN_API_KEY;

app.listen(PORT, () => {
  console.log(`\n✦ Dressim server running at http://localhost:${PORT}`);
  console.log(`  Mode: ${MOCK_MODE ? '🎭 MOCK (no API key required)' : '🚀 LIVE (Fashn.ai)'}\n`);
});
