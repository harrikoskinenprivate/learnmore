# Oppimistehtävät

Luotu: 12.10.2026
Viimeksi päivitetty: 24.10.2026

Kansiossa on tehtäväohjelma ja erillinen englannin tasotesti.

## Tehtäväohjelma

Selainohjelma, jolla opettaja antaa tehtäviä oppilailleen. Sovellus on kansiossa `sovellus/`. Opettaja hallitsee oppilaita ja luo tehtäviä luonnoksena. Luonnos julkaistaan valituille oppilaille, ja sama tehtävä voidaan myöhemmin julkaista muille. Tehtävällä voi olla määräaika. Määräajan jälkeen oppilas voi yhä vastata, mutta tehtävä näkyy myöhässä. Uudessa tehtävässä oppilas palauttaa joko tekstin, yhden kuvan, yhden videon tai pelkän äänitteen. Teksti tallentuu automaattisesti. Opettaja merkitsee palautuksen tarkistetuksi ja voi avata siihen liittyvän palautteen uutena tehtävänä. Palautteita voi olla useita, ja oppilas palauttaa ne samalla tavalla. Aiemmat monikysymystehtävät jäävät luettaviksi. Tehtävän tilat ovat luonnos, aktiivinen ja arkistoitu, ja ne näytetään omina välilehtinään. Aktiivisissa kesken ja tehdyt pysyvät erillään, vanhin ensin, ja opettajalla myös oppilaittain. Arkistosta haetaan 50 viimeksi arkistoitua kerrallaan.

Opettaja lisää oppilaan nimellä ja sähköpostilla Oppilaat-otsikon plus-painikkeesta. Uuden tehtävän hän avaa Tehtävät-otsikon plus-painikkeesta. Oppilas ei kirjaudu salasanalla: opettaja saa avainlinkin, jonka avaaminen avaa oppilaan omat tiedot. Linkki näytetään vain luontihetkellä. Uusi linkki sulkee vanhan ja oppilaan avoimet istunnot. Opettaja kirjautuu edelleen sähköpostilla ja salasanalla. Uusi opettaja lisätään komennolla `npm run db:add-teacher`. Hän näkee samat oppilaat ja tehtävät. Komento ei vaihda olemassa olevaa salasanaa. Oppilaan nimi avaa profiilin, jossa opettaja luo linkin, poistaa oppilaan ja täyttää oppijakortin. Oppilaan alla näkyvät hänelle annetut aktiiviset tehtävät. Etusivun listassa ne ovat kiinni, kunnes opettaja avaa ne plus-painikkeesta. Profiilissa ne ovat auki. Kesken ja palautetut ovat omina välilehtinään. Kesken olevista ylimpänä on aikaisin määräaika, ja ilman määräaikaa oleva on viimeisenä. Myöhässä oleva kesken oleva tehtävä korostetaan punaisella. Palautetuista ylimpänä on viimeksi palautettu. Tehtävän avaaminen oppilaan alta vie tämän oppilaan suoritukseen, ei tehtävän yhteiselle sivulle. Kortti on nimen perässä olevan plus-painikkeen takana, sekä opettajan profiilissa että oppilaan etusivulla. Kortissa on taso, vahvuudet, kehityskohteet ja tavoitteet, yksi kortti per oppilas. Oppilas näkee kortin etusivullaan eikä voi muokata sitä. Tehtävässä on otsikko, ohjeteksti, valinnaisia kuvia, yksi valinnainen ohjevideo ja linkkejä dokumentteihin (vain otsikko ja osoite). Ohjevideon voi kuvata selaimessa tai ladata tiedostona. Kuvauksen aikana opettaja näkee kameran kuvan. Luonnoksen ohjevideon voi poistaa ja korvata. Julkaisun jälkeen sitä ei vaihdeta. Oppilaan palautus on tekstikenttä, kuva, video tai pelkkä äänite. Videon voi kuvata puhelimen kameralla tai ladata tiedostona. Äänite nauhoitetaan selaimessa: Äänitä pyytää puhelimelta mikrofonin, ja jo tallennetun tiedoston voi valita erikseen. Puhelimen HEVC-video muunnetaan H.264-muotoon, jotta kuva näkyy selaimessa. Oppilaan näkymässä nimen alla ei ole valikkoa, koska hänellä ei ole muita näkymiä. Opettajalla nimen alla ovat Oppilaat ja Tehtävät. Oppilas ei näe toisten oppilaiden tietoja. Opettajan salasana ja oppilaan avain tallennetaan tiivisteinä. Istunto on evästeessä.

Paikallinen kokeilu käyttää Next.js:ää ja PostgreSQL:ää. Kuvat, videot ja äänitteet tallentuvat koneelle kansioon `sovellus/data/media`, kun `MEDIA_STORE=local`. Tuotannossa sama polku käyttää yksityistä Cloud Storage -bucketia alueella `europe-north1`. Bucket luodaan erikseen komennolla `./scripts/deploy-infra.sh bucket`. Selain saa lähettää kuvan, videon ja äänitteen bucketiin palvelun osoitteesta. Ohjelmaversion julkaisu ei luo bucketia eikä kirjoita sen muuttujia. Ilmoitukset, pisteet ja kirjallinen kommentti tulevat myöhemmin.

Uusi ohjelmaversio ja palvelun asetukset julkaistaan erikseen. `scripts/deploy-hosting.sh` päivittää vain Cloud Run -kontin. Tietokanta, migraatiot, ympäristömuuttujat ja Secret Manager -secretit päivitetään komennolla `scripts/deploy-infra.sh`, ja vain silloin kun niitä muutetaan. Cloud SQL -instanssia ei luoda skriptillä. Käytössä on olemassa oleva instanssi `hk-pgsql2` ja tietokanta `learnmore`. Cloud Run avaa kannan instanssin unix-socketin kautta. Järjestys ja rajaukset ovat `TECHNICALGUIDE.md`-tiedostossa.

Käynnistys ja tietokannan rakenne on kuvattu `TECHNICALGUIDE.md`-tiedostossa.

## Englannin tasotesti (CEFR A1–C1)

Aikuisille tarkoitettu englannin sijoitustesti. Se arvioi kielitaidon tason CEFR-asteikolla A1–C1 ja sopii eri alojen työntekijöille, työnhakijoille ja opiskelijoille. Tulos on suuntaa antava ryhmä- tai kurssisijoittelu, ei virallinen kielitodistus.

### Tiedostot

- `Englannin tasotesti CEFR A1-C1 - tehtavapaperi.docx` — oppijan osat 1–3 sekä ohje kirjoitukseen ja puheeseen. Ei vastauksia.
- `Englannin tasotesti CEFR A1-C1 - ohjaajan opas.docx` — toteutus, kuuntelun käsikirjoitus, vastausavain, pikatason sääntö ja tuloslomake.
- `English Level Test (CEFR A1–C1) for Entrepreneurs (1).docx` — alkuperäinen versio, jätetty vertailua varten.
- `TECHNICALGUIDE.md` — tehtävien rakenne, pisteytyssääntö ja se, mitä ei pidä muuttaa irrottamatta avainta.
- `CHANGELOG.md` — muutokset päivittäin.

### Käyttö

Oppija tekee kieliopin ja sanaston, lukemisen ja kuuntelun. Ohjaaja antaa sen jälkeen yhden kirjoitustehtävän ja pitää lyhyen puheosuuden. Taso luetaan viidestä pistemäärästä (A1–C1, kukin enintään 10) noin kolmessa minuutissa. Kirjoitus ja puhe voivat siirtää tulosta yhden askeleen.
