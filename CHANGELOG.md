# Muutosloki

## 24.10.2026

Opettajan Tehtävät-sivulla Uusi tehtävä -tekstipainike on vaihdettu plus-painikkeeksi. Se on samankokoinen ja -värinen kuin oppilaan lisäyksen plus-painike, ja se avaa uuden tehtävän lomakkeen. Ruudunlukijalle nimi on edelleen Uusi tehtävä.

Oppilaan näkymässä nimen alla ei ole Tehtävät-painiketta. Oppilaalla ei ole muita näkymiä valittavana, joten valikkoa ei näytetä. Opettajalla nimen alla ovat edelleen Oppilaat ja Tehtävät.

Uuteen tehtävään voi valita palautustavaksi pelkän äänitteen. Oppilas nauhoittaa sen selaimessa: Äänitä pyytää mikrofonin ja tallentaa enintään 3 minuutin ja 25 megatavun äänitteen. Jo tallennetun tiedoston voi valita erikseen. Opettaja kuuntelee palautuksen vasta, kun tehtävä on palautettu. Migraatio on `sovellus/drizzle/0010_audio_response.sql`.

Opettaja näkee oppilaan alla hänelle annetut aktiiviset tehtävät, sekä etusivun listassa että oppilasprofiilissa. Etusivulla lista on kiinni, kunnes sen avaa plus-painikkeesta. Profiiliin pääsee oppilaan nimestä, eikä listassa ole erillistä Avaa-painiketta. Profiilissa lista on auki. Tehtävän avaaminen oppilaan alta vie tämän oppilaan suoritukseen, ei tehtävän yhteiselle sivulle. Kesken ja palautetut ovat omina välilehtinään. Kesken olevista ylimpänä on aikaisin määräaika, ilman määräaikaa oleva on viimeisenä, ja myöhässä oleva korostetaan punaisella. Palautetuista ylimpänä on viimeksi palautettu.

## 22.10.2026

Oppilaan videovastauksen ja ohjevideon katseluikkuna on 16:9. Selain ei enää jätä soitinta oletuskorkeuteen.

Puhelimen HEVC-video muunnetaan H.264-muotoon tallennuksessa ja ensimmäisellä katselulla. Selain näyttää silloin kuvan, ei pelkkää ääntä. Muunnos käyttää kuvan `ffmpeg`-ohjelmaa.

Opettaja voi poistaa ja korvata luonnoksen ohjevideon. Julkaistun tehtävän videota ei vaihdeta. Kuvauksen aikana opettaja näkee kameran kuvan. Esikatselu on mykistetty, ääni tallentuu.

Oppijakortti on kiinni oletuksena. Se avataan nimen perässä olevasta plus-painikkeesta sekä oppilaan etusivulla että opettajan profiilissa.

## 21.10.2026

Uuden opettajan voi lisätä komennolla `npm run db:add-teacher`, ja pilvessä komennolla `./scripts/deploy-infra.sh add-teacher`. Komento ei vaihda olemassa olevaa salasanaa. Kaikki opettajat näkevät samat oppilaat ja tehtävät.

Tehtävän tilat ovat luonnos, aktiivinen ja arkistoitu. Opettaja näkee ne välilehtinä, oppilas aktiiviset ja arkistoidut. Arkistosta haetaan 50 viimeksi arkistoitua, ja seuraavat 50 haetaan erikseen. Arkistoituun tehtävään ei voi enää vastata. Migraatio on `sovellus/drizzle/0009_assignment_archive.sql`.

## 20.10.2026

Opettajan etusivulla oppilaan lisäys on Oppilaat-otsikon plus-painikkeen takana. Oppilaan profiilissa oppijakortti on kiinni, kunnes otsikkoa napsauttaa.

Cloud SQL -julkaisu käyttää olemassa olevaa instanssia `hk-pgsql2` ja tietokantaa `learnmore`. `sql`-komento ei enää luo instanssia. Jos instanssia ei löydy, komento pysähtyy. Uuden tietokantakäyttäjän salasana täyttää Cloud SQL:n merkkivaatimuksen.

Cloud Run ei enää kaadu tietokantaosoitteeseen, jossa konenimi on tyhjä. Sovellus avaa yhteyden Cloud SQL -unix-socketin tiedostoon. Paikallinen `localhost`-osoite säilyy ennallaan.

Videon lähetys puhelimesta bucketiin vaatii, että bucketin CORS sisältää sen Cloud Run -osoitteen, jolla sivu avattiin. `bucket`-komento kirjaa palvelun kaikki osoitteet, ei vain `status.url`-kentän osoitetta.

Opettaja voi avata palautetusta tehtävästä uuden palautteen. Palaute on oma tehtävä, joka linkittyy aiempaan, ja niitä voi olla useita. Sen voi julkaista vain oppilaalle, joka on palauttanut aiemman tehtävän. Oppilas näkee palautteen omissa listoissaan ja palauttaa sen samalla tavalla. Migraatio on `sovellus/drizzle/0008_assignment_feedback.sql`.

## 19.10.2026

Opettaja avaa oppilaan profiilin listasta ja täyttää oppijakortin. Kortissa on taso, vahvuudet, kehityskohteet ja tavoitteet, yksi rivi per oppilas. Oppilas näkee kortin etusivulla eikä voi muokata sitä.

Oppilas ei enää kirjaudu salasanalla. Opettaja luo avainlinkin, joka näytetään vain kerran. Linkki avaa oppilaan istunnon. Uusi linkki sulkee vanhan ja oppilaan avoimet istunnot. Opettajan kirjautuminen säilyy.

Tehtävä on luonnos, kunnes se julkaistaan. Sama tehtävä voidaan julkaista myöhemmin lisää oppilaille. Määräaika on valinnainen ja Suomen aikaa. Määräajan jälkeen vastaus onnistuu, mutta näkymä kertoo myöhästymisestä. Oppilas palauttaa vastauksen, eikä sitä sen jälkeen voi muokata. Opettaja näkee palautuksen ja merkitsee sen tarkistetuksi. Listat ovat kesken ja tehdyt, vanhin ensin, ja opettajalla myös oppilaittain. Aiemmat tehtävät jäävät julkaistuiksi.

Uusi tehtävä käyttää yhtä palautustapaa: tekstikenttä, kuva tai video. Teksti tallentuu automaattisesti. Kuva ja video käyttävät samaa lähetystä kuin ohjemedia, mutta tiedosto kuuluu oppilaalle ja opettaja näkee sen vasta palautuksen jälkeen. Puhelimessa videon kuvaus avaa kameran, tietokoneella valitaan tiedosto. Vanhat monikysymystehtävät jäävät luettaviksi. Migraatiot ovat `sovellus/drizzle/0004_learning_cards.sql`, `sovellus/drizzle/0005_student_access_keys.sql`, `sovellus/drizzle/0006_assignment_lifecycle.sql` ja `sovellus/drizzle/0007_response_kind.sql`.

## 13.10.2026

Opettaja voi liittää tehtävään enintään kahdeksan kuvaa ja yhden ohjevideon. Video kuvataan selaimessa tai ladataan tiedostona, enintään kolme minuuttia. Paikallinen kehitys tallentaa tiedostot kansioon `sovellus/data/media`. Tuotannossa selain lähettää tavut suoraan yksityiseen Cloud Storage -bucketiin. Bucket ja sen oikeudet luodaan komennolla `./scripts/deploy-infra.sh bucket`, ja Cloud Runin `MEDIA_STORE` sekä `GCS_BUCKET` tulevat `config`-komennolla vain jos bucket on olemassa. Versiojulkaisu ei koske bucketiin. Oppilas näkee liitteet vain, jos tehtävä on jaettu hänelle. Oppilaan videovastausta, tarkistusta, pisteitä ja kommenttia ei ole vielä.

## 12.10.2026

Testi irrotettiin yrittäjän roolista ja muokattiin yleiseksi aikuisten työelämä- ja arkitestiksi. Oppijan paperi ja ohjaajan opas erotettiin, jotta vastausavain ja kuuntelun käsikirjoitus eivät kulje oppijan mukana.

Sisällössä vaihdettiin yrittäjyyteen sidotut kohdat (muun muassa start-up, pitch, oma yritys, coworking-jäsenyys ja yhteistyökumppanin sähköposti) tehtäviksi, joista selviää työntekijä, työnhakija tai opiskelija. B2-kieliopin inversio vaihdettiin tasolle sopivaan relatiivilauseeseen. Lukemisen ajanlasku vaihdettiin päivän valintaan, ja kuuntelu kertoo kokousmonisteiden tilauksesta.

Pisteytys kirjoitettiin uudelleen: jokainen taso on 10 pistettä, taso on ylin kunnolla täyttyvä rivi, plus tulee seuraavan rivin osittaisesta onnistumisesta, ja summa /50 vain tarkistaa ettei arvaus nosta tasoa. Kirjoitus ja puhe siirtävät tulosta enintään yhden askeleen, ja vain jos molemmat osoittavat samaan suuntaan. A1 ja C1 erotetaan tuottavissa taidoissa omilla kuvauksillaan.

Tehtäväohjelman ensimmäinen vaihe lisättiin kansioon `sovellus/`. Opettaja ja oppilaat kirjautuvat sähköpostilla ja salasanalla. Opettaja lisää oppilaita, vaihtaa salasanan ja poistaa oppilaan. Oppilaan näkymässä ei ole vielä tehtäviä. Tasotesti jätettiin erilliseksi.

Cloud Run -julkaisu jaettiin kahteen skriptiin. `scripts/deploy-hosting.sh` rakentaa Next.js-kontin ja päivittää vain Cloud Run -revision. Kanta, migraatiot, ympäristömuuttujat ja Secret Manager -secretit ovat `scripts/deploy-infra.sh`-komennoissa, eikä versiokomento koske niihin. Aiempi skripti ei ollut kelvollinen: se rakensi puuttuvaa `backend/Dockerfile`-tiedostoa eikä vienyt palvelua Cloud Runiin.

Tehtäväohjelman toinen vaihe: opettaja luo tehtävän otsikolla, ohjeella, dokumenttilinkeillä ja sanallisilla kysymyksillä ja antaa sen valituille oppilaille. Oppilas näkee vain omat tehtävänsä ja tallentaa kirjalliset vastaukset luonnoksena. Opettaja ei vielä näe vastauksia. Uusi migraatio on `sovellus/drizzle/0002_assignments.sql`. Videoita, kuvia, bucketia, tarkistusta, pisteitä ja kommenttia ei ole vielä.
