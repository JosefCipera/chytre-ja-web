const admin = require('firebase-admin');
const fs = require('fs');
const csv = require('csv-parser');

const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const collectionName = 'productionOrders';
const filePath = './data.csv';

const parseNumberOrNull = (value) => {
  if (value === null || value === undefined || value.trim() === '') return null;
  return parseFloat(value);
};

const parseDateToTimestamp = (dateString) => {
  if (!dateString || dateString.trim() === '') return null;
  return admin.firestore.Timestamp.fromDate(new Date(dateString));
};

console.log(`Zahajuji import ze souboru: ${filePath}`);

fs.createReadStream(filePath)
  .pipe(csv())
  .on('data', async (row) => {
    try {
      // Zkontrolujeme, jestli řádek není prázdný
      if (row.iDZakazky && row.iDZakazky.trim() !== '') {

        // POUŽÍVÁME UŽ JEN camelCase NÁZVY
        const preparedRow = {
          ...row,
          vyrobitKs: parseNumberOrNull(row.vyrobitKs),
          odvedenoKs: parseNumberOrNull(row.odvedenoKs),
          zbyvaVyrobitKs: parseNumberOrNull(row.zbyvaVyrobitKs),
          prubeznaDoba: parseNumberOrNull(row.prubeznaDoba),
          casovePlneniV: parseNumberOrNull(row.casovePlneniV),
          zpozdeniDny: parseNumberOrNull(row.zpozdeniDny),
          terminDodani: parseDateToTimestamp(row.terminDodani),
          planovaneUkonceni: parseDateToTimestamp(row.planovaneUkonceni),
          planovaneZahajeni: parseDateToTimestamp(row.planovaneZahajeni),
          skutecneZahajeni: parseDateToTimestamp(row.skutecneZahajeni),
          skutecneUkonceni: parseDateToTimestamp(row.skutecneUkonceni)
        };

        // Použijeme iDZakazky jako unikátní ID dokumentu a metodu .set()
        // Ta záznam vytvoří, pokud neexistuje, nebo ho přepíše, pokud už existuje.
        const docId = row.iDZakazky;
        await db.collection(collectionName).doc(docId).set(preparedRow);
        console.log(`Úspěšně vytvořena/aktualizována zakázka: ${docId}`);

      } else {
        console.log("Info: Přeskakuji prázdný řádek v CSV.");
      }
    } catch (error) {
      console.error("Chyba při nahrávání řádku:", row, error);
    }
  })
  .on('end', () => {
    console.log('------------------------------------');
    console.log('✅ Import z CSV souboru byl dokončen.');
    console.log('------------------------------------');
  });