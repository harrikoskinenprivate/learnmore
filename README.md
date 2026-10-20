# Oppimistehtävät

Luotu: 12.10.2026
Viimeksi päivitetty: 20.10.2026

Kansiossa on tehtäväohjelma ja erillinen englannin tasotesti.

## Tehtäväohjelma

Selainohjelma, jolla yksi opettaja antaa tehtäviä oppilailleen. Sovellus on kansiossa `sovellus/`. Opettaja hallitsee oppilaita ja luo tehtäviä luonnoksena. Luonnos julkaistaan valituille oppilaille, ja sama tehtävä voidaan myöhemmin julkaista muille. Tehtävällä voi olla määräaika. Määräajan jälkeen oppilas voi yhä vastata, mutta tehtävä näkyy myöhässä. Uudessa tehtävässä oppilas palauttaa joko tekstin, yhden kuvan tai yhden videon. Teksti tallentuu automaattisesti. Opettaja merkitsee palautuksen tarkistetuksi ja voi avata siihen liittyvän palautteen uutena tehtävänä. Palautteita voi olla useita, ja oppilas palauttaa ne samalla tavalla. Aiemmat monikysymystehtävät jäävät luettaviksi. Listat jakautuvat kesken oleviin ja tehtyihin, vanhin ensin, ja opettajalla myös oppilaittain.

Opettaja lisää oppilaan nimellä ja sähköpostilla. Oppilas ei kirjaudu salasanalla: opettaja saa avainlinkin, jonka avaaminen avaa oppilaan omat tiedot. Linkki näytetään vain luontihetkellä. Uusi linkki sulkee vanhan ja oppilaan avoimet istunnot. Opettaja kirjautuu edelleen sähköpostilla ja salasanalla. Oppilaslistan rivi avaa profiilin, jossa opettaja luo linkin, poistaa oppilaan ja täyttää oppijakortin. Kortissa on taso, vahvuudet, kehityskohteet ja tavoitteet, yksi kortti per oppilas. Oppilas näkee kortin etusivulla eikä voi muokata sitä. Tehtävässä on otsikko, ohjeteksti, valinnaisia kuvia, yksi valinnainen ohjevideo ja linkkejä dokumentteihin (vain otsikko ja osoite). Ohjevideon voi kuvata selaimessa tai ladata tiedostona. Oppilaan palautus on tekstikenttä, kuva tai video. Videon voi kuvata puhelimen kameralla tai ladata tiedostona. Oppilas ei näe toisten oppilaiden tietoja. Opettajan salasana ja oppilaan avain tallennetaan tiivisteinä. Istunto on evästeessä.

Paikallinen kokeilu käyttää Next.js:ää ja PostgreSQL:ää. Kuvat ja videot tallentuvat koneelle kansioon `sovellus/data/media`, kun `MEDIA_STORE=local`. Tuotannossa sama polku käyttää yksityistä Cloud Storage -bucketia alueella `europe-north1`. Bucket luodaan erikseen komennolla `./scripts/deploy-infra.sh bucket`. Ohjelmaversion julkaisu ei luo bucketia eikä kirjoita sen muuttujia. Ilmoitukset, pisteet ja kirjallinen kommentti tulevat myöhemmin.

Uusi ohjelmaversio ja palvelun asetukset julkaistaan erikseen. `scripts/deploy-hosting.sh` päivittää vain Cloud Run -kontin. Tietokanta, migraatiot, ympäristömuuttujat ja Secret Manager -secretit päivitetään komennolla `scripts/deploy-infra.sh`, ja vain silloin kun niitä muutetaan. Järjestys ja rajaukset ovat `TECHNICALGUIDE.md`-tiedostossa.

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
