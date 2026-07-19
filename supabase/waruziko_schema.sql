-- Waruziko (facts of the day), mid-story kid questions, and reading helpers
-- Run in Supabase SQL Editor after stories_schema.sql

-- Curated Rwandan culture facts (shared across households)
CREATE TABLE IF NOT EXISTS waruziko_facts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_index INTEGER NOT NULL UNIQUE,
  title_en TEXT NOT NULL,
  title_rw TEXT,
  body_en TEXT NOT NULL,
  body_rw TEXT,
  category TEXT NOT NULL DEFAULT 'culture'
    CHECK (category IN ('culture', 'language', 'history', 'values', 'nature', 'food')),
  theme_label TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Per-kid views of today's Waruziko (optional analytics)
CREATE TABLE IF NOT EXISTS waruziko_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  kid_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fact_id UUID NOT NULL REFERENCES waruziko_facts(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (kid_id, fact_id)
);

-- Mid-story questions from learners (answered by parent/elder)
CREATE TABLE IF NOT EXISTS kid_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  kid_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  story_id UUID REFERENCES stories(id) ON DELETE SET NULL,
  sentence_id UUID REFERENCES story_sentences(id) ON DELETE SET NULL,
  sentence_order INTEGER,
  question_text TEXT NOT NULL,
  answer_text TEXT,
  answered_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  answered_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS kid_questions_household_unanswered_idx
  ON kid_questions (household_id, created_at DESC)
  WHERE answer_text IS NULL;

CREATE INDEX IF NOT EXISTS waruziko_views_household_idx
  ON waruziko_views (household_id, viewed_at DESC);

-- Seed a rotating set of Rwandan culture facts (day_index 0–13, cycles yearly)
INSERT INTO waruziko_facts (day_index, title_en, title_rw, body_en, body_rw, category, theme_label)
VALUES
  (0, 'Ubuntu — I am because we are', 'Ubuntu — Ndiho kubera twese',
   'In Rwanda and across Africa, Ubuntu means we care for each other. A strong family looks after neighbours, elders, and children together.',
   'Mu Rwanda no mu Afurika, Ubuntu bisobanura ko twita ku bandi. Umuryango ukomeye urita ku baturanyi, abakuru n''abana.',
   'values', 'Ubuntu'),
  (1, 'Umuganda — working together', 'Umuganda — gukorera hamwe',
   'Every last Saturday of the month, communities gather for Umuganda — cleaning streets, planting trees, and helping neighbours. It is a national day of service.',
   'Buri wa gatandatu wa nyuma mu kwezi, abaturage bahura mu Muganda — gusukura, gutera ibiti, no gufasha abaturanyi. Ni umunsi w''igihugu wo gukora.',
   'values', 'Umuganda'),
  (2, 'Ubwiyunge — healing and reconciliation', 'Ubwiyunge — gukira no kubabarirana',
   'After hard times, Rwanda chose Ubwiyunge — coming together again, telling truth, and rebuilding trust in families and communities.',
   'Nyuma y''ibihe bikomeye, u Rwanda rwahisemo Ubwiyunge — gusubira hamwe, kuvuga ukuri, no kongera kwizerana mu muryango n''mu muryango.',
   'values', 'Ubwiyunge'),
  (3, 'Kinyarwanda greetings', 'Imyiryane mu Kinyarwanda',
   'A warm greeting is “Muraho!” (hello) or “Amakuru?” (how are you?). Elders often reply “Ni meza” — things are well — and ask about your family.',
   'Imyiryane ishyushye ni “Muraho!” cyangwa “Amakuru?”. Abakuru bakunze gusubiza “Ni meza” — bishobora kuba byiza — bakabaza umuryango wawe.',
   'language', 'Ubuntu'),
  (4, 'The cow and respect', 'Inka n''icyubahiro',
   'Cows (inka) are a treasure in Rwandan culture. Giving a cow can mean deep respect, friendship, or celebration of a bond between families.',
   'Inka ni umutungo mu muco w''u Rwanda. Guha inka bishobora kubera icyubahiro, ubucuti, cyangwa kwizihiza umubano w''imiryango.',
   'culture', 'Ubuntu'),
  (5, 'Intore — dance of the heroes', 'Intore — umbyino w''intwari',
   'Intore dancers leap high and tell stories of courage with drums and movement. Watching Intore feels like watching living history.',
   'Ababyinnyi b''Intore barambura hejuru bakavuga inkuru z''ubutwari n''ingoma n''imbyino. Kureba Intore ni nk''ukureba amateka ahari.',
   'culture', 'Ubuntu'),
  (6, 'Imigongo — geometric art', 'Imigongo — ubugeni bw''imishongo',
   'Imigongo art uses bold black, white, and red patterns. Traditionally made with cow dung and natural colours, it decorates homes with meaning and beauty.',
   'Ubugeni bw''Imigongo bukoresha imishongo y''umukara, umweru n''umutuku. Bikorwa n''amase y''inka n''amabara kamere, bigatunganya amazu n''ubwiza.',
   'culture', NULL),
  (7, 'Saying thank you', 'Gushimira',
   '“Murakoze” means thank you. To elders or a group, people often say “Murakoze cyane” — thank you very much — with both hands or a slight bow of the head.',
   '“Murakoze” bisobanura urakoze. Ku bakuru cyangwa itsinda, abantu bakunze kuvuga “Murakoze cyane” — bakoresha amaboko yombi cyangwa gutuza umutwe.',
   'language', 'Ubuntu'),
  (8, 'Lake Kivu and the hills', 'Ikiyaga cya Kivu n''imisozi',
   'Rwanda is called the land of a thousand hills. Lake Kivu on the west sparkles between mountains — a place of fishing, stories, and quiet sunsets.',
   'u Rwanda rwitwa igihugu cy''imisozi igihumbi. Ikiyaga cya Kivu mu burengerazuba kiraheshesha hagati y''imisozi — aho abarobyi, inkuru, n''izuba rirashe.',
   'nature', NULL),
  (9, 'Sharing a meal', 'Gusangira ifunguro',
   'Sharing food is hospitality. Guests are welcomed with something to drink or eat — refusing politely once is common, but accepting shows friendship.',
   'Gusangira ifunguro ni uburyo bwo kwakira abashyitsi. Abashyitsi bakirwa n''ikinyobwa cyangwa ifunguro — kwanga neza rimwe ni bisanzwe, ariko kwemera bigaragaza ubucuti.',
   'food', 'Ubuntu'),
  (10, 'Stories by the fire', 'Inkuru ku ziko',
   'Elders once told stories (imigani) around the fire at night. Fables taught children kindness, cleverness, and how to live well with others.',
   'Abakuru babwiraga inkuru (imigani) ku ziko nijoro. Imigani yigisha abana ubuntu, ubwenge, n''uburyo bwo kubana neza n''abandi.',
   'culture', 'Ubuntu'),
  (11, 'Respect for elders', 'Icyubahiro ku bakuru',
   'Children greet elders first and often use both hands when giving or receiving something. Listening carefully is a sign of respect (icyubahiro).',
   'Abana basuhuza abakuru mbere kandi bakunze gukoresha amaboko yombi mu guha cyangwa kwakira ikintu. Kumva neza ni ikimenyetso cy''icyubahiro.',
   'values', 'Ubuntu'),
  (12, 'Agaseke — peace basket', 'Agaseke — agaseke k''amahoro',
   'The tall woven basket called agaseke is a symbol of peace and love. Families give them at weddings and celebrations as a wish for harmony.',
   'Agaseke karemare ni ikimenyetso cy''amahoro n''urukundo. Imiryango ikaha mu bukwe n''ibirori nk''icyifuzo cy''ubumwe.',
   'culture', 'Ubwiyunge'),
  (13, 'Ikinyarwanda words for family', 'Amagambo y''umuryango',
   'Mama is mother, Data (or Papa) is father, and Sokuru / Sokuruza are grandparents. Learning family words helps you speak with love at home.',
   'Mama ni mama, Data (cyangwa Papa) ni papa, Sokuru / Sokuruza ni abakuru b''umuryango. Kumenya amagambo y''umuryango bigufasha kuvugana n''urukundo mu rugo.',
   'language', 'Ubuntu')
ON CONFLICT (day_index) DO NOTHING;

NOTIFY pgrst, 'reload schema';
