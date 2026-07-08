-- ============================================================
-- ISMS seed data — Iraqi cities, hospitals, government, roads
-- ============================================================

INSERT INTO layers (type, name, name_ar, description, color, geometry) VALUES
  ('cities',     'Cities',               'المدن',            'Major Iraqi cities',              '#e8b64c', 'POINT'),
  ('hospitals',  'Hospitals',            'المستشفيات',       'Public hospitals',                '#e14d4d', 'POINT'),
  ('government', 'Government Buildings', 'المباني الحكومية', 'Ministries and directorates',     '#3f8efc', 'POINT'),
  ('roads',      'Roads',                'الطرق',            'National highways',               '#8a7ff0', 'LINESTRING');

-- ---------- Cities ----------
INSERT INTO locations (name, name_ar, layer_id, properties, geom) VALUES
  ('Baghdad', 'بغداد',  (SELECT id FROM layers WHERE type='cities'),
   '{"population": 7565000, "governorate": "Baghdad", "capital": true}',
   ST_SetSRID(ST_MakePoint(44.3661, 33.3152), 4326)),
  ('Basra',   'البصرة', (SELECT id FROM layers WHERE type='cities'),
   '{"population": 2600000, "governorate": "Basra"}',
   ST_SetSRID(ST_MakePoint(47.7804, 30.5085), 4326)),
  ('Mosul',   'الموصل', (SELECT id FROM layers WHERE type='cities'),
   '{"population": 1740000, "governorate": "Nineveh"}',
   ST_SetSRID(ST_MakePoint(43.1189, 36.3400), 4326)),
  ('Erbil',   'أربيل',  (SELECT id FROM layers WHERE type='cities'),
   '{"population": 1610000, "governorate": "Erbil"}',
   ST_SetSRID(ST_MakePoint(44.0089, 36.1911), 4326)),
  ('Karbala', 'كربلاء', (SELECT id FROM layers WHERE type='cities'),
   '{"population": 1218000, "governorate": "Karbala"}',
   ST_SetSRID(ST_MakePoint(44.0249, 32.6160), 4326));

-- ---------- Hospitals ----------
INSERT INTO locations (name, name_ar, layer_id, properties, geom) VALUES
  ('Baghdad Medical City',        'مدينة الطب',              (SELECT id FROM layers WHERE type='hospitals'),
   '{"beds": 3000, "city": "Baghdad", "emergency": true}',
   ST_SetSRID(ST_MakePoint(44.3852, 33.3480), 4326)),
  ('Al-Yarmouk Teaching Hospital','مستشفى اليرموك التعليمي', (SELECT id FROM layers WHERE type='hospitals'),
   '{"beds": 1200, "city": "Baghdad", "emergency": true}',
   ST_SetSRID(ST_MakePoint(44.3439, 33.3050), 4326)),
  ('Al-Kindi Hospital',           'مستشفى الكندي',           (SELECT id FROM layers WHERE type='hospitals'),
   '{"beds": 800, "city": "Baghdad", "emergency": true}',
   ST_SetSRID(ST_MakePoint(44.4239, 33.3489), 4326)),
  ('Basra General Hospital',      'مستشفى البصرة العام',     (SELECT id FROM layers WHERE type='hospitals'),
   '{"beds": 900, "city": "Basra", "emergency": true}',
   ST_SetSRID(ST_MakePoint(47.7893, 30.5202), 4326)),
  ('Ibn Sina Hospital (Mosul)',   'مستشفى ابن سينا',         (SELECT id FROM layers WHERE type='hospitals'),
   '{"beds": 700, "city": "Mosul", "emergency": true}',
   ST_SetSRID(ST_MakePoint(43.1300, 36.3556), 4326)),
  ('Rizgary Teaching Hospital',   'مستشفى رزكاري التعليمي',  (SELECT id FROM layers WHERE type='hospitals'),
   '{"beds": 600, "city": "Erbil", "emergency": true}',
   ST_SetSRID(ST_MakePoint(44.0272, 36.2043), 4326)),
  ('Al-Hussein Medical City',     'مدينة الحسين الطبية',     (SELECT id FROM layers WHERE type='hospitals'),
   '{"beds": 1100, "city": "Karbala", "emergency": true}',
   ST_SetSRID(ST_MakePoint(44.0435, 32.5936), 4326));

-- ---------- Government buildings ----------
INSERT INTO locations (name, name_ar, layer_id, properties, geom) VALUES
  ('Council of Ministers',        'مجلس الوزراء',        (SELECT id FROM layers WHERE type='government'),
   '{"city": "Baghdad", "level": "federal"}',
   ST_SetSRID(ST_MakePoint(44.3936, 33.3128), 4326)),
  ('Ministry of Health',          'وزارة الصحة',         (SELECT id FROM layers WHERE type='government'),
   '{"city": "Baghdad", "level": "federal"}',
   ST_SetSRID(ST_MakePoint(44.4404, 33.3306), 4326)),
  ('Baghdad Governorate Office',  'ديوان محافظة بغداد',  (SELECT id FROM layers WHERE type='government'),
   '{"city": "Baghdad", "level": "governorate"}',
   ST_SetSRID(ST_MakePoint(44.3735, 33.3306), 4326)),
  ('Basra Governorate Office',    'ديوان محافظة البصرة', (SELECT id FROM layers WHERE type='government'),
   '{"city": "Basra", "level": "governorate"}',
   ST_SetSRID(ST_MakePoint(47.8025, 30.5258), 4326)),
  ('Erbil Governorate Office',    'ديوان محافظة أربيل',  (SELECT id FROM layers WHERE type='government'),
   '{"city": "Erbil", "level": "governorate"}',
   ST_SetSRID(ST_MakePoint(44.0092, 36.1900), 4326));

-- ---------- Roads (simplified national highways) ----------
INSERT INTO locations (name, name_ar, layer_id, properties, geom) VALUES
  ('Highway 1: Baghdad – Mosul', 'الطريق السريع 1: بغداد – الموصل',
   (SELECT id FROM layers WHERE type='roads'),
   '{"ref": "HW1", "lanes": 4}',
   ST_SetSRID(ST_MakeLine(ARRAY[
     ST_MakePoint(44.3661, 33.3152),
     ST_MakePoint(44.2000, 34.1500),
     ST_MakePoint(43.7000, 34.9000),
     ST_MakePoint(43.4900, 35.4700),
     ST_MakePoint(43.1189, 36.3400)
   ]), 4326)),
  ('Highway 8: Baghdad – Basra', 'الطريق السريع 8: بغداد – البصرة',
   (SELECT id FROM layers WHERE type='roads'),
   '{"ref": "HW8", "lanes": 4}',
   ST_SetSRID(ST_MakeLine(ARRAY[
     ST_MakePoint(44.3661, 33.3152),
     ST_MakePoint(44.9500, 32.4800),
     ST_MakePoint(45.8200, 31.8400),
     ST_MakePoint(46.2500, 31.0500),
     ST_MakePoint(47.7804, 30.5085)
   ]), 4326)),
  ('Highway 9: Baghdad – Karbala', 'الطريق السريع 9: بغداد – كربلاء',
   (SELECT id FROM layers WHERE type='roads'),
   '{"ref": "HW9", "lanes": 4}',
   ST_SetSRID(ST_MakeLine(ARRAY[
     ST_MakePoint(44.3661, 33.3152),
     ST_MakePoint(44.2200, 33.0200),
     ST_MakePoint(44.0249, 32.6160)
   ]), 4326));

-- ---------- Users (bcrypt via pgcrypto — compatible with bcryptjs) ----------
INSERT INTO users (username, password_hash, role) VALUES
  ('admin',  crypt('admin123',  gen_salt('bf', 10)), 'admin'),
  ('gov',    crypt('gov123',    gen_salt('bf', 10)), 'government_user'),
  ('viewer', crypt('viewer123', gen_salt('bf', 10)), 'viewer');
