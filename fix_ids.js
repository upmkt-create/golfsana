const fs = require('fs');

let data = fs.readFileSync('src/data.ts', 'utf8');

// Replacements map
const replacements = {
  "dep-esportiu-social": "dep-esportiu",
  "dep-reserves": "dep-comercial",
  "dep-proshop": "dep-comercial",
  "dep-golf-societies-pros": "dep-comercial"
};

for (const [oldId, newId] of Object.entries(replacements)) {
  data = data.split('"' + oldId + '"').join('"' + newId + '"');
}

fs.writeFileSync('src/data.ts', data);
