# Muutosloki

## 20.10.2026

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
