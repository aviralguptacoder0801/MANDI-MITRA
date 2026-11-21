import test from 'node:test';
import assert from 'node:assert/strict';
import {
  findNearestDistrict,
  getDefaultLanguageForDistrict,
  TRANSLATIONS,
} from './i18n';

test('getDefaultLanguageForDistrict maps UP regions to their local languages', () => {
  assert.equal(getDefaultLanguageForDistrict('barabanki'), 'awadhi');
  assert.equal(getDefaultLanguageForDistrict('lucknow'), 'awadhi');
  assert.equal(getDefaultLanguageForDistrict('prayagraj'), 'awadhi');
  assert.equal(getDefaultLanguageForDistrict('varanasi'), 'bhojpuri');
  assert.equal(getDefaultLanguageForDistrict('agra'), 'hi');
  assert.equal(getDefaultLanguageForDistrict('kanpur'), 'hi');
});

test('findNearestDistrict resolves GPS coordinates to nearest UP district and language', () => {
  const vns = findNearestDistrict(25.32, 82.97);
  assert.equal(vns.districtId, 'varanasi');
  assert.equal(vns.language, 'bhojpuri');
  assert.equal(vns.inUpRegion, true);

  const lko = findNearestDistrict(26.85, 80.95);
  assert.equal(lko.districtId, 'lucknow');
  assert.equal(lko.language, 'awadhi');
  assert.equal(lko.inUpRegion, true);

  const agra = findNearestDistrict(27.18, 78.01);
  assert.equal(agra.districtId, 'agra');
  assert.equal(agra.language, 'hi');
  assert.equal(agra.inUpRegion, true);

  // Far outside UP (e.g. Mumbai) still returns closest UP district with inUpRegion=false
  const outside = findNearestDistrict(19.076, 72.8777);
  assert.equal(outside.inUpRegion, false);
});

test('all four language bundles provide complete non-empty UI translations', () => {
  for (const lang of ['hi', 'awadhi', 'bhojpuri', 'en'] as const) {
    const t = TRANSLATIONS[lang];
    assert.ok(t.languageName.length > 0);
    assert.ok(t.nav.profit.length > 0);
    assert.ok(t.profit.title.length > 0);
    assert.ok(t.profit.qualityGood.length > 0);
    assert.ok(t.locationBar.useGps.length > 0);
    assert.ok(t.chatbot.greeting.length > 0);
  }
});
