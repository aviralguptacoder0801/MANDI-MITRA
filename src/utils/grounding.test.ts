import test from 'node:test';
import assert from 'node:assert/strict';
import { extractGroundingSources, selectGroundingTool } from './grounding';

test('selectGroundingTool routes location and route queries to Google Maps grounding', () => {
  assert.equal(selectGroundingTool('Find cold storage near me in Barabanki'), 'maps');
  assert.equal(selectGroundingTool('बाराबंकी के पास कोल्ड स्टोर कहाँ है?'), 'maps');
  assert.equal(selectGroundingTool('What is the driving route to Dubagga mandi?'), 'maps');
  assert.equal(selectGroundingTool('Agra mandi kitni door hai?'), 'maps');
});

test('selectGroundingTool routes market price, MSP, and news queries to Google Search grounding', () => {
  assert.equal(selectGroundingTool('What is the latest UP wheat MSP rate for 2026?'), 'search');
  assert.equal(selectGroundingTool('आज यूपी में आलू का भाव और मौसम कैसा रहेगा?'), 'search');
  assert.equal(selectGroundingTool('Should I sell my potato today or hold?'), 'search');
});

test('selectGroundingTool respects explicit user mode override', () => {
  assert.equal(selectGroundingTool('Today wheat MSP rate', 'maps'), 'maps');
  assert.equal(selectGroundingTool('Cold store near me', 'search'), 'search');
});

test('extractGroundingSources extracts deduplicated web and maps links including review snippets', () => {
  const chunks = [
    { web: { uri: 'https://agmarknet.gov.in/', title: 'Agmarknet Portal' } },
    { web: { uri: 'https://agmarknet.gov.in/', title: 'Duplicate Agmarknet' } },
    {
      maps: {
        uri: 'https://maps.google.com/?cid=12345',
        title: 'Dubagga Mandi Lucknow',
        placeAnswerSources: {
          reviewSnippets: [
            {
              content: 'Large wholesale vegetable and potato market.',
              googleMapsUri: 'https://maps.google.com/?cid=12345&review=1',
            },
          ],
        },
      },
    },
  ];

  const sources = extractGroundingSources(chunks);
  assert.equal(sources.length, 3);
  assert.equal(sources[0].type, 'web');
  assert.equal(sources[0].title, 'Agmarknet Portal');
  assert.equal(sources[1].type, 'maps');
  assert.equal(sources[1].title, 'Dubagga Mandi Lucknow');
  assert.equal(sources[1].snippet, 'Large wholesale vegetable and potato market.');
  assert.equal(sources[2].uri, 'https://maps.google.com/?cid=12345&review=1');
});
