-- Tabelle erstellen
CREATE TABLE IF NOT EXISTS license_plates (
  id         BIGSERIAL PRIMARY KEY,
  code       TEXT        NOT NULL UNIQUE,
  city       TEXT        NOT NULL,
  district   TEXT        NOT NULL,
  state      TEXT        NOT NULL DEFAULT 'Niedersachsen',
  level      INTEGER     NOT NULL DEFAULT 0,
  next_review TIMESTAMPTZ NULL
);

-- Index für effiziente Abfragen nach next_review
CREATE INDEX IF NOT EXISTS idx_license_plates_next_review
  ON license_plates (next_review ASC NULLS FIRST);

-- Niedersachsen – alle Kennzeichen einfügen
INSERT INTO license_plates (code, city, district, state) VALUES

  -- Kreisfreie Städte
  ('BS',  'Braunschweig',          'Braunschweig',      'Niedersachsen'),
  ('DEL', 'Delmenhorst',           'Delmenhorst',       'Niedersachsen'),
  ('EMD', 'Emden',                 'Emden',             'Niedersachsen'),
  ('H',   'Hannover',              'Region Hannover',   'Niedersachsen'),
  ('OL',  'Oldenburg',             'Oldenburg',         'Niedersachsen'),
  ('OS',  'Osnabrück',             'Osnabrück',         'Niedersachsen'),
  ('SZ',  'Salzgitter',            'Salzgitter',        'Niedersachsen'),
  ('WHV', 'Wilhelmshaven',         'Wilhelmshaven',     'Niedersachsen'),
  ('WOB', 'Wolfsburg',             'Wolfsburg',         'Niedersachsen'),

  -- Landkreise (aktuelle Kennzeichen)
  ('AME', 'Westerstede',           'Ammerland',         'Niedersachsen'),
  ('AUR', 'Aurich',                'Aurich',            'Niedersachsen'),
  ('BRA', 'Brake (Unterweser)',    'Wesermarsch',       'Niedersachsen'),
  ('CE',  'Celle',                 'Celle',             'Niedersachsen'),
  ('CLP', 'Cloppenburg',           'Cloppenburg',       'Niedersachsen'),
  ('CUX', 'Cuxhaven',              'Cuxhaven',          'Niedersachsen'),
  ('DAN', 'Lüchow',                'Lüchow-Dannenberg', 'Niedersachsen'),
  ('DH',  'Diepholz',              'Diepholz',          'Niedersachsen'),
  ('EL',  'Meppen',                'Emsland',           'Niedersachsen'),
  ('FRI', 'Jever',                 'Friesland',         'Niedersachsen'),
  ('GF',  'Gifhorn',               'Gifhorn',           'Niedersachsen'),
  ('GÖ',  'Göttingen',             'Göttingen',         'Niedersachsen'),
  ('GS',  'Goslar',                'Goslar',            'Niedersachsen'),
  ('HE',  'Helmstedt',             'Helmstedt',         'Niedersachsen'),
  ('HI',  'Hildesheim',            'Hildesheim',        'Niedersachsen'),
  ('HK',  'Bad Fallingbostel',     'Heidekreis',        'Niedersachsen'),
  ('HM',  'Hameln',                'Hameln-Pyrmont',    'Niedersachsen'),
  ('HOL', 'Holzminden',            'Holzminden',        'Niedersachsen'),
  ('LER', 'Leer (Ostfriesland)',   'Leer',              'Niedersachsen'),
  ('LG',  'Lüneburg',              'Lüneburg',          'Niedersachsen'),
  ('NI',  'Nienburg (Weser)',      'Nienburg',          'Niedersachsen'),
  ('NOH', 'Nordhorn',              'Grafschaft Bentheim','Niedersachsen'),
  ('NOM', 'Northeim',              'Northeim',          'Niedersachsen'),
  ('OHZ', 'Osterholz-Scharmbeck', 'Osterholz',         'Niedersachsen'),
  ('PE',  'Peine',                 'Peine',             'Niedersachsen'),
  ('ROW', 'Rotenburg (Wümme)',     'Rotenburg (Wümme)', 'Niedersachsen'),
  ('SHG', 'Stadthagen',            'Schaumburg',        'Niedersachsen'),
  ('STD', 'Stade',                 'Stade',             'Niedersachsen'),
  ('UEL', 'Uelzen',                'Uelzen',            'Niedersachsen'),
  ('VEC', 'Vechta',                'Vechta',            'Niedersachsen'),
  ('VER', 'Verden (Aller)',        'Verden',            'Niedersachsen'),
  ('WF',  'Wolfenbüttel',          'Wolfenbüttel',      'Niedersachsen'),
  ('WL',  'Winsen (Luhe)',         'Harburg',           'Niedersachsen'),
  ('WTM', 'Wittmund',              'Wittmund',          'Niedersachsen'),

  -- Reaktivierte Kennzeichen (seit ~2013 wieder gültig)
  ('MEP', 'Meppen',                'Emsland',           'Niedersachsen'),
  ('NOR', 'Norden',                'Aurich',            'Niedersachsen'),
  ('OLL', 'Wildeshausen',          'Oldenburg (Land)',  'Niedersachsen'),
  ('SOL', 'Soltau',                'Heidekreis',        'Niedersachsen')

ON CONFLICT (code) DO NOTHING;
