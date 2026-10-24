# Tekninen ohje

Luotu: 12.10.2026
Viimeksi päivitetty: 24.10.2026

Tämä ohje kattaa tehtäväohjelman ja englannin tasotestin. Tasotestin oppijalle annetaan vain tehtäväpaperi.

## Tehtäväohjelma

Sovellus on kansiossa `sovellus/`. Vaihe 1 on kirjautuminen ja oppilaiden hallinta. Vaihe 2 on tehtävän luonti, jako valituille oppilaille ja kirjallisen luonnoksen tallennus. Vaihe 3 lisää opettajan kuvat ja yhden ohjevideon. Vaihe 4 on oppilasprofiili ja oppijakortti. Vaihe 5 on oppilaan avainlinkki. Vaihe 6 on tehtävän luonnos, julkaisu, määräaika, palautus ja tarkistus. Vaihe 7 on yksi palautustapa: tekstikenttä, kuva, video tai pelkkä äänite. Vaihe 8 on opettajan palaute uutena tehtävänä, joka linkittyy aiempaan. Vanhat monikysymystehtävät jäävät luettaviksi. Ilmoitukset, pisteet ja kirjallinen kommentti eivät ole vielä. Cloud Run-, Cloud SQL- ja bucket-skriptit ovat valmiina, mutta tätä muutosta ei ole ajettu Google Cloudiin.

### Käynnistys

```bash
cd sovellus
npm install
npm run db:up
npm run db:migrate
npm run db:seed
npm run dev
```

Sovellus aukeaa osoitteessa `http://localhost:3000`. PostgreSQL käynnistyy Dockerilla, käyttäjä ja tietokanta ovat `oppimistehtavat`, portti 5432. Yhteysmerkkijono ja ensimmäisen opettajan tiedot ovat `.env`-tiedostossa. Malli on `.env.example`. Paikallinen esimerkkisalasana on vain tälle koneelle. Se vaihdetaan ennen kuin ohjelmaa jaetaan.

`db:seed` luo opettajan vain, jos kannassa ei ole yhtään opettajaa. Se ei vaihda olemassa olevan opettajan salasanaa.

`db:add-teacher` lisää opettajan, vaikka kannassa olisi jo opettaja. Aseta nimi, sähköposti ja salasana komentorivillä. Komentorivin arvo korvaa `.env`-tiedoston, jotta ensimmäisen opettajan tunnus ei tule vahingossa käyttöön:

```bash
cd sovellus
TEACHER_NAME="Toinen opettaja" \
TEACHER_EMAIL="toinen@example.com" \
TEACHER_PASSWORD="vahva-salasana" \
npm run db:add-teacher
```

Nimi on 1–80 merkkiä, sähköposti enintään 200 merkkiä ja salasana 8–200 merkkiä. Sähköposti tallennetaan pienaakkosin. Jos osoite on jo opettajalla tai oppilaalla, komento pysähtyy eikä vaihda salasanaa. Uusi opettaja näkee samat oppilaat, tehtävät ja oppijakortit. Sovellus ei erottele opettajia toisistaan.

### Rakenne

- Next.js 16, React 19, TypeScript ja Tailwind 4. `cacheComponents` on päällä. Istunto luetaan pyynnön aikana `Suspense`-rajan takana, eikä käyttäjää tai oppilaslistaa laiteta välimuistiin. Poistettu tunnus ei siis jää näkyviin välimuistin takia.
- Drizzle ORM ja `postgres`. Skeema on `src/lib/db/schema.ts`. Käytetty SQL on `drizzle/0001_init.sql`, `drizzle/0002_assignments.sql`, `drizzle/0003_assignment_media.sql`, `drizzle/0004_learning_cards.sql`, `drizzle/0005_student_access_keys.sql`, `drizzle/0006_assignment_lifecycle.sql`, `drizzle/0007_response_kind.sql`, `drizzle/0008_assignment_feedback.sql`, `drizzle/0009_assignment_archive.sql` ja `drizzle/0010_audio_response.sql`. `scripts/migrate.ts` ajaa uudet tiedostot tauluun `schema_migrations` eikä aja samaa tiedostoa uudelleen. Jo ajettua SQL-tiedostoa ei muokata. Skeema ja uusi SQL-tiedosto päivitetään yhdessä.
- Opettajan salasana tiivistetään `bcryptjs`-kirjastolla, kustannus 12. Tietokantaan ei tallenneta salasanaa. Oppilaan `password_hash` on satunnainen eikä sillä kirjauduta: kirjautuminen hylkää roolin `student` samalla virheellä kuin väärän salasanan, bcrypt-vertailun jälkeen.
- Istunnon eväste on `istunto`. Se on `httpOnly`, `sameSite=lax` ja voimassa 14 päivää. Tuotannossa eväste on `secure`. Tietokantaan tallennetaan tunnisteen SHA-256-tiiviste. Evästeen asetus on `src/lib/session.ts`.
- Roolit ovat `teacher` ja `student`. Opettajan tarkistus on `requireTeacher`. Oppilaan lisäys, poisto ja profiilin luku ovat `src/lib/students.ts`. Poisto ja profiili kohdistuvat vain rooliin `student`. Jos tunnusta ei ole tai se ei ole oppilas, profiili vastaa `notFound`.
- Oppilaan avain on taulu `student_access_keys`, yksi rivi per oppilas. Tietokannassa on vain SHA-256-tiiviste, samaan tapaan kuin istunnossa. Raaka avain on 32 tavua base64url-muodossa ja näytetään opettajalle vain luontivastauksessa. `GET /avain/[token]` tarkistaa muodon ja tiivisteen, luo istunnon ja ohjaa etusivulle. Virheellinen avain ohjaa osoitteeseen `/avain/virhe` eikä kerro, puuttuiko avain vai oliko se vanha. Uusi avain korvaa rivin ja poistaa kyseisen oppilaan istunnot. Vanha linkki ja vanha eväste lakkaavat toimimasta. Reitti lukee evästeen heti, jotta onnistunut ja epäonnistunut polku eivät jää välimuistiin. Reittitiedostoon ei lisätä `export const runtime`.
- Oppijakortti on taulu `learning_cards`, yksi rivi per oppilas (`student_id` on pääavain ja viittaa `users.id`, poisto ketjuttaa). Rivi syntyy vasta ensimmäisellä tallennuksella. Kentät ovat `level` (enintään 200 merkkiä) sekä `strengths`, `development_areas` ja `goals` (kukin enintään 2000). Tyhjä kenttä on sallittu, ja arvo tallennetaan trimmattuna. Tallennus on `src/lib/learning-cards.ts`: se tarkistaa opettajan ja että kohde on oppilas, sitten tekee upsertin. Oppilas lukee vain oman rivinsä. Opettajan lomake ei näy oppilaalle.
- Tehtävät ovat `src/lib/assignments.ts`. Uusi tehtävä syntyy tilaan `draft`, ellei sitä julkaista heti. Julkaistu tehtävä on aktiivinen, kunnes opettaja asettaa `archived_at`. Arkistointi ei vaihda `status`-arvoa, jotta vanhat `published`-tarkistukset löytävät rivin. Oppilas näkee tehtävän vain, jos tila on `published` ja rivi on taulussa `assignment_students`. Arkistoituun tehtävään ei tallenneta vastausta eikä palautusta. Listat ovat välilehtiä: opettajalla luonnokset, aktiiviset ja arkistoidut, oppilaalla aktiiviset ja arkistoidut. Aktiivisissa kesken ja tehdyt pysyvät, vanhin ensin. Opettajan etusivulla ja oppilasprofiilissa saman oppilaan aktiiviset tehtävät ovat lisäksi omina välilehtinään. Kesken tarkoittaa riviä, jonka `returned_at` on tyhjä, ja se järjestetään `deadline`-kentän mukaan aikaisin ensin. Ilman määräaikaa oleva on viimeisenä, ja sama määräaika järjestetään `created_at`-kentän mukaan. Myöhässä oleva kesken oleva kortti käyttää `danger`-värejä. Palautetut järjestetään `returned_at`-kentän mukaan uusin ensin. Lista ei sisällä luonnosta eikä arkistoitua tehtävää. Profiili lukee yhden oppilaan rivit funktiolla `listTeacherAssignmentsForStudent`. Etusivu ryhmittelee `listTeacherWork`-tuloksen oppilaittain. Lista on asiakaskomponentissa `StudentTaskList` ja on kiinni sivun latautuessa. Plus-painike avaa sen, ja paneeli jää DOM:iin kiinni ollessaan. Oppilaan nimi on linkki profiiliin. Erillistä Avaa-painiketta ei ole. Profiilissa sama lista on auki. Kortin osoite on `/oppilaat/[id]/tehtavat/[assignmentId]`. Sivu näyttää vain tämän oppilaan tilan, palautuksen ja tarkistuksen. Tehtävän yhteinen sivu `/tehtavat/[id]` jää linkiksi. Jos oppilas ei ole tehtävällä, vastaus on `notFound`. Arkistolista järjestetään `archived_at`- ja `id`-kentän mukaan uusin ensin. `listArchivedAssignments` hakee enintään 50 riviä ja yhden ylimääräisen, jotta seuraavan sivun kohdistin voidaan päätellä. Seuraava sivu haetaan palvelintoiminnolla `loadMoreArchivedAssignments`, ei koko arkistoa kerralla. Kohdistin on viimeisen rivin `archived_at` ja `id`. Muuten vastaus on `notFound`. Luonnoksen tallennus ja palautus tarkistavat saman jaon. Palautus kirjoittaa `returned_at` ja estää myöhemmän muokkauksen. Tarkistus kirjoittaa `reviewed_at`, ja se onnistuu vain palautetulle riville. Opettaja lukee vastaukset vasta palautuksen jälkeen. Määräaika on `deadline`, valinnainen `timestamptz`. Selain lähettää `datetime-local`-arvon ilman aikavyöhykettä, ja palvelin tulkitsee sen vyöhykkeellä `Europe/Helsinki`. Myöhässä-merkintä käyttää palautusaikaa, tai kelloa jos tehtävää ei ole palautettu. Aiemmat tehtävät saavat migraatiossa tilan `published`. Julkaistun tehtävän sisältöä ei muokata luonnin jälkeen. Luonnoksen ohjevideon voi poistaa ja korvata. Määräaikaa voi vaihtaa, ja oppilaita voi lisätä julkaisuun myöhemmin. Jo lisättyä oppilasta ei poisteta tässä vaiheessa.
- Palaute on tavallinen tehtävä, jonka `parent_assignment_id` viittaa aiempaan tehtävään. Viittaus poistuu ketjuttaen, jos aiempi tehtävä poistetaan. Palautteita voi olla useita, ja palaute voi itse saada jatkopalautteen. Luonti ja myöhempi julkaisu hyväksyvät vain oppilaan, jonka `returned_at` on asetettu aiemmalla tehtävällä. Oppilas näkee julkaistun palautteen omissa listoissaan ja linkin aiempaan tehtävään. Opettaja avaa uuden palautteen palautetun rivin kohdalta.
- Uuden tehtävän `response_kind` on `text`, `image`, `video` tai `audio`. Vanhan tehtävän arvo on tyhjä, ja silloin kysymykset sekä taulu `answers` jäävät käyttöön. Uutta tehtävää luotaessa kysymysrivejä ei synny. Tekstivastaus on taulussa `assignment_responses` (`body`, enintään 8000 merkkiä). Selain tallentaa tekstin noin 0,8 sekunnin kuluttua muutoksesta ja myös kentästä poistuttaessa. Tyhjä teksti on sallittu luonnoksena. Palautus vaatii muun merkin kuin välilyönnin ja lukitsee rivin. Kuva-, video- ja äänitevastaus on yksi `assignment_media`-rivi, jonka `student_id` on oppilas ja jonka `assignment_responses.media_id` osoittaa. Uusi tiedosto korvaa edellisen, ja vanha tiedosto poistetaan vahvistuksen jälkeen. Palautus vaatii valmiin (`ready`) tiedoston, jonka laji vastaa tehtävän palautustapaa. Äänite nauhoitetaan `getUserMedia({ audio: true })`-kutsulla ja `MediaRecorder`-luokalla. Selain valitsee tyypin järjestyksessä `audio/webm;codecs=opus`, `audio/webm`, `audio/mp4`. Tallennus katkeaa 180 sekunnissa. Tiedostovalinta tarkistaa keston `audio`-elementillä. Nauhoituksen kestoa ei tarkisteta uudelleen, koska ajastin katkaisee sen.
- Tehtävässä on otsikko (1–120), ohje (1–4000) ja enintään 15 linkkiä. Linkki on otsikko ja `http`- tai `https`-osoite, enintään 2000 merkkiä. Tyhjä linkkirivi ohitetaan. Vanhan monikysymystehtävän vastaus on edelleen enintään 8000 merkkiä, ja tallennus päivittää saman oppilaan ja kysymyksen rivin (`UNIQUE (student_id, question_id)`).
- Opettajan kuvat ja ohjevideo ovat valinnaisia ja erillään oppilaan palautuksesta. Kuvia enintään 8, tyypit `image/jpeg`, `image/png` ja `image/webp`, koko enintään 8 Mt. Ohjevideoita yksi, tyypit `video/mp4` ja `video/webm`, koko enintään 150 Mt ja kesto enintään 180 sekuntia. Oppilaan kuva- tai videopalautus käyttää samat tyyppi- ja kokorajat, ja videoita on yksi. Äänitepalautus on yksi tiedosto, tyypit `audio/webm`, `audio/mp4`, `audio/mpeg`, `audio/aac` ja `audio/wav`, koko enintään 25 Mt ja kesto enintään 180 sekuntia. Puhelimen `audio/x-m4a`, `audio/m4a`, `audio/x-wav` ja `audio/wave` hyväksytään samoina muotoina. Opettajan ohjemedia ei voi olla äänite. Keston tarkistaa selain. Palvelin tarkistaa tyypin ja koon. Mp4, jonka näyte on `hvc1`, `hev1`, `dvh1` tai `dvhe`, muunnetaan `ffmpeg`-ohjelmalla H.264-muotoon (`libx264`, enintään 1280 px leveä, `faststart`). Muunnos tehdään vahvistuksessa ja uudelleen ensimmäisellä katselulla, jos tiedosto on yhä HEVC. Selain ei näytä HEVC-kuvaa, vaikka AAC-ääni kuuluu. Cloud Run -kuvassa on `ffmpeg`. Webm jätetään ennalleen. Luonnoksen ohjevideon voi poistaa tai korvata toiminnolla `setDraftInstructionVideo`. Julkaistun tehtävän ohjemediaa ei vaihdeta. Kuvaus käyttää `getUserMedia`-virtaa ja näyttää sen mykistettynä `video.srcObject`-esikatseluna. Tallenne on edelleen webm. Taulu on `assignment_media`. Ohjerivi syntyy ilman `assignment_id`- ja `student_id`-arvoa tilaan `pending`, selain lähettää tavut, ja vahvistus merkitsee rivin `ready`. Tehtävän luonti liittää valmiit, vielä kiinnittämättömät ohjerivit samaan transaktioon. Jos jokin tunniste ei kelpaa, koko tehtävä perutaan. Oppilaan palautusrivi saa `assignment_id`- ja `student_id`-arvon heti luonnissa. Vahvistus lukitsee oppilaan tehtävärivin, merkitsee tiedoston valmiiksi ja päivittää `assignment_responses.media_id`. Julkaistun tehtävän sisältöä ei voi muokata luonnin jälkeen. Luonnoksen uusi ohjevideo liitetään ensin, ja vasta sitten vanha video poistetaan. Irralliset kesken jääneet ohjerivit saavat jäädä.
- Tallennus valitaan muuttujalla `MEDIA_STORE`. Oletus ja paikallinen arvo `local` kirjoittaa kansioon `sovellus/data/media`. Avain on `images/{uuid}`, `videos/{uuid}` tai `audio/{uuid}`, eikä käyttäjän polkua oteta vastaan. `gcs` käyttää `@google-cloud/storage`-kirjastoa vain silloin, kun tuo arvo on päällä. Selain saa allekirjoitetun PUT-osoitteen ja lähettää tavut suoraan bucketiin. Katselu paikallisesti on `GET /api/media/[id]` (Range ja 206). Tuotannossa sama osoite vastaa 302 allekirjoitettuun lukuosoitteeseen, jotta videotavut eivät kulje Cloud Runin kautta. Välimuisti on `private, no-store`.
- Median luku vaatii istunnon. Opettaja saa lukea valmiin ohjeliitteen, joka kuuluu olemassa olevaan tehtävään. Oppilas saa ohjeliitteen vain, jos `assignment_students` yhdistää hänet tehtävään. Oppilaan palautustiedoston (`student_id` ei ole tyhjä) näkee vain sama oppilas, ja opettaja vasta kun `returned_at` on asetettu. Muuten vastaus on 404. Keskeneräistä tai kiinnittämätöntä tiedostoa ei jaeta. Ohjemedian listaus jättää palautusrivit pois (`student_id` on tyhjä). Reittitiedostoihin ei saa lisätä `export const runtime`, koska `cacheComponents` hylkää sen.
- Otsikko on `src/components/app-header.tsx`. Opettajalla nimen alla ovat linkit Oppilaat (`/`) ja Tehtävät (`/tehtavat`). Oppilaalla navigointia ei renderöidä, koska ainoa linkki olisi Tehtävät ja etusivu näyttää tehtävät jo. Uloskirjautuminen säilyy molemmilla.
- Sivut: `/` (opettajalla oppilaat, oppilaalla oppijakortti ja omat tehtävät välilehdissä), `/oppilaat/[id]` (vain opettaja; muu ohjataan etusivulle; profiilissa saman oppilaan kesken- ja palautetut-välilehdet), `/oppilaat/[id]/tehtavat/[assignmentId]` (vain opettaja; tämän oppilaan suoritus), `/avain/[token]`, `/avain/virhe`, `/tehtavat` (tilat välilehtinä), `/tehtavat/uusi` (vain opettaja; muu ohjataan etusivulle) ja `/tehtavat/[id]`. Julkaistun tehtävän sivulla opettaja arkistoi tai palauttaa tehtävän aktiiviseksi. Istunto luetaan edelleen `Suspense`-rajan takana. Avainlinkin luonti ja oppilaan poisto ovat profiilissa. Poisto ohjaa onnistuessaan etusivulle. Olemassa olevalla oppilaalla ei ole linkkiä, ennen kuin opettaja luo sen profiilissa. Opettajan etusivun lisäyslomake on asiakaskomponentissa `TeacherStudentList` ja aukeaa plus-painikkeesta. Tehtävät-sivun otsikon plus-painike on linkki osoitteeseen `/tehtavat/uusi`. Se käyttää samoja mittoja ja väriä kuin oppilaan lisäyksen painike (`h-11 w-11`, `bg-pine`). Näkyvä merkki on `+`, ja ruudunlukijan nimi on Uusi tehtävä. Lomake jää DOM:iin kiinni ollessaan, jotta luontivastauksen avainlinkki ei katoa, jos paneeli suljetaan ja avataan uudelleen. Oppijakortti on asiakaskomponentissa `LearningCardToggle`. Plus-painike on nimen perässä, ja kortti on kiinni sivun latautuessa. Sama rakenne on oppilaan etusivulla ja opettajan profiilissa. Paneeli jää DOM:iin kiinni ollessaan.
- Sähköposti tallennetaan pienaakkosin. Sama osoite ei voi olla kahdella tunnuksella. Drizzle käärii Postgresin virheen, joten kaksoiskappale tunnistetaan virhekoodista `23505` myös `cause`-ketjusta.
- Kirjautumisvirhe on aina sama lause. Puuttuvan tunnuksen kohdalla tehdään silti bcrypt-vertailu, jotta vastausaika ei paljasta tunnuksen olemassaoloa.

`create-next-app` teki kansioon `sovellus/` oman git-repositorion. Juuren dokumentit ovat sen ulkopuolella, kunnes historiat yhdistetään.

### Mitä muutoksessa pidetään yhdessä

- `src/lib/db/schema.ts` ja uusi SQL-tiedosto kansiossa `drizzle/`.
- Evästeen nimi, tiiviste ja vanheneminen `src/lib/session.ts`-tiedostossa.
- Roolitarkistus jokaisessa toiminnossa, joka lukee tai muuttaa oppilaita tai tehtäviä. Käyttöliittymän piilotus ei riitä. Oppilaan kyselyyn lisätään aina ehto, että rivi on jaettu tälle oppilaalle.
- Salasanan tiiviste ei siirry selaimeen. Lomakkeille annetaan vain nimi, sähköposti ja tunniste.
- `scripts/deploy-hosting.sh` ei saa saada lippuja, jotka kirjoittavat ympäristömuuttujia, Secret Manager -secrettejä tai Cloud SQL -liitosta. Ne kuuluvat `scripts/deploy-infra.sh`-tiedostoon.
- Socket-osoitteen muoto `scripts/deploy-infra.sh`-tiedoston `build_socket_url`-funktiossa ja sen luku `sovellus/src/lib/db/connection.ts`-tiedostossa.

### Julkaisu

Alueen oletus on `europe-north1`. Projekti, palvelun nimi ja muut nimet ovat `scripts/gcp-env.sh`-tiedostossa. Oletusprojekti on `development-475808`. Sen voi vaihtaa ympäristömuuttujalla `PROJECT_ID` ennen komennon ajoa. Tiedostossa ei ole salasanoja.

Kuva rakennetaan `sovellus/Dockerfile`-tiedostosta. `next.config.ts` asettaa `output: "standalone"`, jotta tuotantokuva käynnistää `.next/standalone/server.js`. Paikallinen `npm run dev` ei käytä sitä. Kontti kuuntelee osoitetta `0.0.0.0` ja Cloud Runin antamaa `PORT`-porttia. Oletus on 8080. `.dockerignore` jättää `.env`-tiedostot pois, jotta salaisuus ei päädy kuvaan. Build-vaiheessa on paikallinen valeosoite, koska Next.js lukee tietokantamoduulin jo käännöksessä. Valeosoite ei siirry ajoajan kuvaan. Tuotannon `DATABASE_URL` tulee vain Secret Managerista.

Versiokomento ei luo kantaa, ei aja migraatiota eikä kirjoita muuttujia tai secrettejä. Se vain rakentaa kuvan, vie sen Artifact Registry -repoon `cloud-run-source-deploy` ja tekee uuden Cloud Run -revision olemassa olevilla asetuksilla. Jos palvelua ei vielä ole, se luo palvelun pelkällä kontilla ja jättää sen yksityiseksi.

```bash
./scripts/deploy-hosting.sh
```

Infra-komennot ajetaan vain, kun niiden kohde muuttuu:

```bash
./scripts/deploy-infra.sh registry
./scripts/deploy-infra.sh sql
./scripts/deploy-hosting.sh
./scripts/deploy-infra.sh bucket
./scripts/deploy-infra.sh config
./scripts/deploy-infra.sh migrate
./scripts/deploy-infra.sh seed
```

Ensimmäisellä kerralla järjestys on tuo. Sen jälkeen pelkkä uusi ohjelmaversio on `./scripts/deploy-hosting.sh`.

- `registry` luo docker-repon, jos se puuttuu.
- `sql` ei luo Cloud SQL -instanssia. Se käyttää olemassa olevaa instanssia `hk-pgsql2` projektissa `development-475808` alueella `europe-north1`. Tietokanta on `learnmore`. Nimet voi vaihtaa muuttujilla `SQL_INSTANCE` ja `SQL_DATABASE` ennen komennon ajoa. Jos kanta puuttuu tältä instanssilta, komento luo vain sen. Käyttäjä `oppimistehtavat` ja `DATABASE_URL`-secret luodaan, jos molemmat puuttuvat. Uuden salasanan lopussa on `Aa1!`, koska Cloud SQL vaatii pienen ja ison kirjaimen, numeron ja erikoismerkin. Olemassa olevaa salasanaa tai secretin arvoa ei vaihdeta. Jos instanssia ei löydy, komento pysähtyy.
- `secrets` vaihtaa salasanan ja kirjoittaa uuden secret-version. Se vaatii `DB_PASSWORD`-muuttujan eikä päivitä Cloud Runia. Uusi versio otetaan käyttöön vasta `config`-komennolla, koska palvelu lukee secretin revision käynnistyessä.
- `bucket` luo yksityisen bucketin `GCS_BUCKET` (oletus `PROJEKTI-oppimistehtavat-media`) alueelle `europe-north1`, jos sitä ei ole. Uniform bucket-level access ja public access prevention ovat päällä. CORS sallii `http://localhost:3000` ja palvelun kaikki Cloud Run -osoitteet, jos palvelu on jo olemassa. Selain lähettää videon suoraan bucketiin, joten osoitteen, jolla sivu avattiin, pitää olla listalla. Jos bucket luotiin ennen palvelua, aja komento uudelleen palvelun luonnin jälkeen. Jos palvelu on olemassa, ajoajan palvelutili saa bucketissa roolin `roles/storage.objectAdmin` ja itselleen roolin `roles/iam.serviceAccountTokenCreator`, jotta allekirjoitettu osoite syntyy ilman avaintiedostoa. Komento ei päivitä Cloud Runin kuvaa.
- `config` liittää olemassa olevaan palveluun Cloud SQL -instanssin, secretin `DATABASE_URL` ja muuttujan `DATABASE_POOL_MAX` (oletus 5). Se asettaa muistin 1 GiB, yhden CPU:n, samanaikaisuuden 20 ja portin 8080. Se avaa palvelun kirjautumissivulle (`allUsers` roolilla `roles/run.invoker`). Jos bucket on olemassa, sama komento lisää `MEDIA_STORE=gcs` ja `GCS_BUCKET` sekä samat luku- ja allekirjoitusoikeudet. Jos bucketia ei ole, media-muuttujia ei kirjoiteta. Se ei rakenna kuvaa eikä aja migraatiota.
- `migrate` ajaa `sovellus/scripts/migrate.ts` Cloud SQL Auth Proxyn kautta portissa 9470, jotta komento ei osu paikalliseen Docker-Postgresiin portissa 5432. Migraatio on idempotentti `schema_migrations`-taulun kautta.
- `seed` luo ensimmäisen opettajan samoilla ehdoilla kuin paikallinen `db:seed`. Se ei lue `sovellus/.env`-tiedostoa. Anna `TEACHER_NAME`, `TEACHER_EMAIL` ja `TEACHER_PASSWORD` komennon ympäristössä. Olemassa olevan opettajan salasanaa ei vaihdeta. Opettajan tunnuksia ei viedä Cloud Run -palveluun.
- `add-teacher` lisää opettajan samalla tavalla kuin paikallinen `db:add-teacher`. Se ei lue `sovellus/.env`-tiedostoa. Anna samat kolme muuttujaa komennon ympäristössä. Sama sähköposti hylätään, eikä olemassa olevaa salasanaa vaihdeta. Opettajan tunnuksia ei viedä Cloud Run -palveluun.

`DATABASE_URL` on Secret Manager -secret `oppimistehtavat-database-url`. Arvo on Postgres-osoite, jonka `host`-parametri on Cloud Runin unix-socketin hakemisto `/cloudsql/development-475808:europe-north1:hk-pgsql2` ja kanta on `learnmore`. Konenimi osoitteessa on tyhjä (`@/learnmore`). `postgres.js` antaisi merkkijonon Nodelle, ja `new URL` hylkää sen. `sovellus/src/lib/db/connection.ts` lukee käyttäjän, salasanan ja kannan ja avaa socket-tiedoston `/cloudsql/development-475808:europe-north1:hk-pgsql2/.s.PGSQL.5432`. Paikallinen osoite, jossa on `localhost`, kulkee merkkijonona ennallaan. Migraatio, seed ja add-teacher eivät käytä tätä polkua: infra-skripti vaihtaa osoitteen muotoon `127.0.0.1` ennen ajoa. `DATABASE_POOL_MAX` ei ole secret.

Älä aja infra-skriptiä `bash -x` -jäljityksellä. `gcloud sql users` saa salasanan komentoriviltä, joten se näkyy hetken prosessilistassa, mutta skripti ei tulosta sitä. Cloud SQL Auth Proxy v2 (`cloud-sql-proxy`) pitää olla asennettuna ennen `migrate`-, `seed`- ja `add-teacher`-komentoja. `sovellus`-kansiossa pitää olla ajettu `npm install`, koska migraatio käyttää paikallista `tsx`-komentoa.

Bucketia ei luoda versiokomenossa. Ensimmäisellä media-käyttöönotolla järjestys on `./scripts/deploy-infra.sh bucket` ja sen jälkeen `./scripts/deploy-infra.sh config`. Migraatio `0003_assignment_media.sql` ajetaan erikseen `migrate`-komennolla. Skriptejä ei ole ajettu Google Cloudiin tämän muutoksen yhteydessä. Paikallinen `.env` käyttää `MEDIA_STORE=local`. Kansio `data` on git- ja docker-ignore-listoilla.

## Englannin tasotesti

Tämä osuus on ylläpitäjälle ja myöhemmille muutoksille. Oppijalle annetaan vain tehtäväpaperi.

### Tarkoitus ja raja

Testi on sijoitustesti, ei taitotodistus. Se asettaa aikuisen oppijan CEFR-tasolle alle A1–C1 noin yhden tason tarkkuudella. C2:ta ei mitata. Plus on rajatapaus saman tason yläreunassa, ei oma virallinen tasonsa.

Rakenne on tarkoituksella lyhyt, koska käyttötilanne on kurssin tai valmennuksen aloitus. Sitä ei ole pilotoitu eikä normeerattu. Cut scoreja ei saa esittää ikään kuin ne olisivat Oxford Placement Testin, Linguaskillin, Aptisin, EF SET:n tai TOEIC:n tavoin kalibroituja.

### Rakenne

| Osa | Tehtäviä | Aika | Pisteet | Mitä mittaa |
| --- | --- | --- | --- | --- |
| 1 Kielioppi ja sanasto | 30 monivalintaa, 6 kutakin tasoa A1–C1 | 15–20 min | 30 | Muoto ja keskeinen kollokaatio tai idioma |
| 2 Lukeminen | 1 teksti, 10 kysymystä, 2 kutakin tasoa | 10 min | 10 | Yksityiskohta, päättely ja sanan merkitys kontekstissa |
| 3 Kuuntelu | 1 viesti kahdesti, 10 kysymystä, 2 kutakin tasoa | 10 min | 10 | Sama vastaanottona |
| 4 Kirjoitus | 1 ohjaajan valitsema sähköposti | 10 min | taso, ei pistettä | Tehtävän täyttö, sävy ja tarkkuus |
| 5 Puhe | Lyhyt haastattelu, lopetus kun taso pettää | 5–7 min | taso, ei pistettä | Vuorovaikutus tutusta ja abstraktimmasta aiheesta |

Osat 1–3 ratkaisevat tason. Osat 4–5 voivat siirtää sitä yhden askeleen.

Yksi yhteinen lukuteksti ja yksi kuunteluteksti ovat nopeuden hinta. Helpot kysymykset ovat tekstin alussa ja vaikeat lopussa. Tämä ei vastaa usean tekstin vastaanottokoetta. Jos testi joskus pidennetään, lisätään erilliset tekstit tasoittain sen sijaan että yhteen tekstiin tungetaan lisää kysymyksiä.

### Toteutus pidettävä vakiona

- Ei sanakirjaa, kääntäjää eikä puhelinta.
- Tyhjä vastaus on sallittu ja toivottava, kun oppija ei tiedä. Arvaus nostaa sattumatulosta.
- Kuuntelu luetaan tai soitetaan kahdesti samoin sanoin, luontevalla nopeudella, noin 10 sekunnin tauolla. Oppilas näkee vain kysymykset ja ehtii lukea ne ensin.
- Ohjaaja ei selitä sanoja eikä helpota kysymyksiä testin aikana.
- Kirjoitustehtävä valitaan vasta osien 1–3 tuloksen jälkeen: A1–B1+ ja tähdellinen tulos saavat 60–80 sanan viestin, B2–C1 saavat 120–150 sanan viestin.
- Jos oppija ei ole töissä, hän vastaa opinnoista, kodista tai vapaaehtoistyöstä. Tätä ei jätetä arvattavaksi kesken tehtävän.

### Vastausavain

Väärä tai tyhjä = 0. Oikea = 1. Vain yksi vaihtoehto hyväksytään.

| Taso | Kielioppi ja sanasto | Lukeminen | Kuuntelu |
| --- | --- | --- | --- |
| A1 | 1b, 2b, 3a, 4b, 5a, 6c | 1c, 2a | 1c, 2b |
| A2 | 7b, 8b, 9a, 10b, 11b, 12a | 3b, 4c | 3a, 4c |
| B1 | 13b, 14b, 15b, 16c, 17b, 18c | 5a, 6b | 5a, 6b |
| B2 | 19b, 20c, 21b, 22a, 23b, 24a | 7c, 8a | 7b, 8a |
| C1 | 25a, 26a, 27b, 28a, 29a, 30a | 9b, 10a | 9c, 10b |

Kohta 24: vain *which*. Pilkullinen relatiivilause ei hyväksy *that*.

Kohta 11 (*since* + perfekti) on A2-korin yläreunassa ja kohta 29 (*would rather* + imperfekti) C1-korin alareunassa. Niitä ei siirretä toiseen koriin ilman koko rivisäännön uudelleenarviota.

### Pisteytys

Jokainen taso saa enintään 10 pistettä. Summa on enintään 50.

1. Perustaso on ylin rivi, jossa on vähintään 7/10, jos jokainen helpompi rivi on vähintään 6/10.
2. Jos seuraavalla rivillä on 5 tai 6 ja jokainen helpompi rivi on vähintään 7, lisää plus.
3. Jos yksikään rivi ei täyty: A1 5–6 = A1, A1 0–4 = alle A1.
4. Yksi poikkeus: rivi jossa on 5, ja heti seuraava rivi on vähintään 8, lasketaan kuutoseksi. Vain kerran. Merkitse tähti. Plussaa ei tule, jos jokin helpompi rivi on tämän jälkeen vain 6.
5. Summataulukko ei koskaan nosta tasoa. 0–17 alle A1, 18–24 A1, 25–30 A2, 31–36 B1, 37–42 B2, 43–50 C1. Jos summan taso on kahta tai useampaa tasoa matalampi kuin rivitulos, käytä matalampaa ja vahvista puheella. Yhden tason ero ei kumoa rivitulosta.

Tuottavat taidot ympyröidään kokonaisina tasoina. Kahden tason välissä valitaan matalampi. Ne siirtävät osien 1–3 tulosta vain, jos molemmat ovat samassa suunnassa. Vertailussa plussaa ei lasketa, joten B1+ on B1. Askel on yksi pykälä listassa: alle A1, A1, A1+, A2, A2+, B1, B1+, B2, B2+, C1. Tähdellistä tasoa ei nosteta.

Jos holistinen arvio horjuu, neljän kriteerin keskiarvo (tehtävä, sanasto, kielioppi, sujuvuus) muutetaan tasoksi: alle 1,5 A1, 1,5–2,4 A2, 2,5–3,4 B1, 3,5–4,4 B2, 4,5–5 C1. Keskiarvo pyöristetään alas. Tätä ei käytetä, jos holistinen taso on jo selvä, jotta pisteytys pysyy nopeana.

### Mitä muutoksessa pitää päivittää yhtä aikaa

- Tehtäväpaperin kohta, ohjaajan oppaan avain ja tämän tiedoston avaintaulukko.
- Jos kohdan vaikeus muuttuu, se siirretään oikeaan tasokoriin. Kuuden kohdan korit ovat pisteytyksen perusta. Yksittäisen C1-idiomin vaihtaminen B1-kollokaatioksi rikkoo rivin.
- Lukutekstin ja kuuntelukäsikirjoituksen vaikeus nousee loppua kohti. A1-kysymys ei saa edellyttää viimeisen kappaleen inversiota.
- Älä palauta oppijan paperiin avainta, käsikirjoitusta tai puhumisen kysymyksiä. Kysymysten näkeminen etukäteen muuttaa puheosan valmistelluksi monologiksi.

### Sisältöraja

Tehtävien maailma on toimisto, tiimi, tapaaminen, viesti, tilaus ja aikataulu. Ne sopivat eri ammatteihin. Vältä uusia kohtia, jotka edellyttävät omaa yritystä, rahoitusta, myyntipuhetta tai esimiesasemaa. Työtön tai opiskelija tarvitsee paperissa olevan varapolun.

### Tunnetut heikkoudet

- Ei pilottia, ei item-analyysia, ei reliabiliteettikerrointa eikä standardivirhettä.
- Kolme vaihtoehtoa: sattuma on noin kolmannes. Alle A1 -raja (summa 0–17) on suunnilleen arvauksen varassa.
- Lukemisen hintakysymys edellyttää vähennyslaskua 195 − 180. Se on jätetty, koska se oli alkuperäisessä ja on lyhyt. Jos kohta toimii huonosti, vaihda se niin että tekstissä sanotaan korotus suoraan.
- Yksi teksti kahta taitoa kohti aliarvioi helposti heikon lukijan, joka väsyy ennen A1-vastauksia, tai yliarvioi vahvan testitekniikan käyttäjän.
- Yksi arvioija kirjoituksessa ja puheessa. Rajatapauksessa toinen kuulija parantaa osien 4–5 luotettavuutta, mutta ei ole pakollinen tavallisessa ryhmäsijoittelussa.
