import { v4 as uuidv4 } from "uuid";
import type { CatalogItem } from "../types.js";
import type { DdexMessageOpts } from "./ddexMessageOpts.js";
import { buildEan13From12, isValidEan13 } from "../metadata/ean13.js";

const NS = "http://ddex.net/xml/ern/43";

function langScriptCode(item: CatalogItem): string {
  const l = (item.language ?? "").toLowerCase();
  if (l.includes("việt") || l === "vi") return "vi";
  if (l.includes("english") || l === "en") return "en";
  if (l.includes("instrumental")) return "zxx";
  return "en";
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function releaseIdBlock(item: CatalogItem): string {
  let upc = item.upc?.replace(/\s/g, "") ?? "";
  const isrc = item.isrc?.replace(/[-\s]/g, "") ?? "";
  if (item.type === "Album/EP") {
    if (/^\d{12}$/.test(upc)) {
      upc = buildEan13From12(upc);
    }
    if (/^\d{13}$/.test(upc) && isValidEan13(upc)) {
      return `<ICPN IsEan="true">${esc(upc)}</ICPN>`;
    }
  }
  if (item.type === "Single" && isrc.length >= 12) {
    return `<ISRC>${esc(item.isrc!.trim())}</ISRC>`;
  }
  return `<ProprietaryId Namespace="urn:smg:release">${esc(item.id)}</ProprietaryId>`;
}

function releaseTypeTag(item: CatalogItem): string {
  return item.type === "Single" ? "Single" : "Album";
}

function imageSection(item: CatalogItem, imgRef: string): string {
  const url = item.coverAssetUrl?.trim();
  if (!url || !/^https?:\/\//i.test(url)) return "";
  return `
  <Image>
    <ImageType>FrontCoverImage</ImageType>
    <ResourceReference>${esc(imgRef)}</ResourceReference>
    <ReferenceTitle>
      <TitleText>${esc(item.title)} — Cover</TitleText>
    </ReferenceTitle>
    <ImageDetailsByTerritory>
      <TerritoryCode>Worldwide</TerritoryCode>
      <TechnicalImageDetails>
        <TechnicalResourceDetails>
          <File>
            <URL>${esc(url)}</URL>
          </File>
        </TechnicalResourceDetails>
      </TechnicalImageDetails>
    </ImageDetailsByTerritory>
  </Image>`;
}

/**
 * ERN 4.3 NewReleaseMessage — cấu trúc đầy đủ hơn cho ingestion CIS (VK, Yandex, ZVUK, Kion).
 * Điền PADPIDA thật trong .env; aggregator có thể yêu cầu thêm trường (Deal chi tiết, cue sheet…).
 */
export function buildErn43NewReleaseMessage(item: CatalogItem, opts: DdexMessageOpts): string {
  const messageId = uuidv4();
  const created = new Date().toISOString();
  const titleBase = esc(item.title);
  const title =
    item.version?.trim() ? `${titleBase} (${esc(item.version.trim())})` : titleBase;
  const artist = esc(item.artist?.trim() || "Unknown Artist");
  const feat = item.artistFeatured?.trim();
  const displayArtistFeaturedXml = feat
    ? `
        <DisplayArtist>
          <PartyName FullName="${esc(feat)}"/>
          <ArtistRole>FeaturedArtist</ArtistRole>
        </DisplayArtist>`
    : "";
  const label = esc(item.labelName?.trim() || item.title.trim() || "Label");
  const lang = langScriptCode(item);
  const genre = esc([item.genreMain, item.genreSub].filter(Boolean).join(" / ") || "Unknown");
  const pline = esc(item.pline?.trim() || `℗ ${new Date().getFullYear()} ${item.artist || "Artist"}`);
  const cline = esc(item.cline?.trim() || `© ${new Date().getFullYear()} ${item.artist || "Artist"}`);
  const startDate = esc(item.releaseDate?.trim() || new Date().toISOString().slice(0, 10));
  const audioUrl = item.audioAssetUrl?.trim() || "";
  const resRef = "A1";
  const imgRef = "IMG1";
  const relRef = "R0";
  const partyArtist = "PARTY_ARTIST1";
  const partyLabel = "PARTY_LABEL1";

  const territoriesXml = opts.territoryCodes.map((c) => `        <TerritoryCode>${esc(c)}</TerritoryCode>`).join("\n");

  const coverBlock = imageSection(item, imgRef);

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<ernm:NewReleaseMessage xmlns:ernm="${NS}" MessageSchemaVersionId="ern/43" LanguageAndScriptCode="${esc(lang)}"
  xmlns:xs="http://www.w3.org/2001/XMLSchema-instance"
  xs:schemaLocation="${NS} http://ddex.net/xml/ern/43/release-notification.xsd">
  <MessageHeader>
    <MessageId>${esc(messageId)}</MessageId>
    <MessageSender>
      <PartyId IsDPID="true">${esc(opts.senderPartyId)}</PartyId>
      <PartyName FullName="${esc(opts.senderName)}"/>
    </MessageSender>
    <MessageRecipient>
      <PartyId IsDPID="true">${esc(opts.recipientPartyId)}</PartyId>
      <PartyName FullName="${esc(opts.recipientName)}"/>
    </MessageRecipient>
    <MessageCreatedDateTime>${esc(created)}</MessageCreatedDateTime>
  </MessageHeader>
  <UpdateIndicator>OriginalMessage</UpdateIndicator>
  <PartyList>
    <Party>
      <PartyReference>${partyArtist}</PartyReference>
      <PartyName FullName="${artist}"/>
    </Party>
    <Party>
      <PartyReference>${partyLabel}</PartyReference>
      <PartyName FullName="${label}"/>
    </Party>
    <Party>
      <PartyReference>PARTY_SOUL_SENDER</PartyReference>
      <PartyId IsDPID="true">${esc(opts.senderPartyId)}</PartyId>
      <PartyName FullName="${esc(opts.senderName)}"/>
    </Party>
  </PartyList>
  <ResourceList>
    <SoundRecording>
      <SoundRecordingType>MusicalWorkSoundRecording</SoundRecordingType>
      <ResourceReference>${resRef}</ResourceReference>
      <ReferenceTitle>
        <TitleText>${title}</TitleText>
      </ReferenceTitle>
      ${item.type === "Single" && item.isrc?.trim() && item.isrc !== "—" && item.isrc !== "-" ? `<ISRC>${esc(item.isrc.trim())}</ISRC>` : ""}
      <SoundRecordingDetailsByTerritory>
        <TerritoryCode>Worldwide</TerritoryCode>
        <Title TitleType="FormalTitle">
          <TitleText>${title}</TitleText>
        </Title>
        <DisplayArtist>
          <PartyName FullName="${artist}"/>
          <ArtistRole>MainArtist</ArtistRole>
        </DisplayArtist>${displayArtistFeaturedXml}
      </SoundRecordingDetailsByTerritory>
      <TechnicalSoundRecordingDetails>
        <TechnicalResourceDetails>
          <File>
            <URL>${esc(audioUrl)}</URL>
          </File>
        </TechnicalResourceDetails>
      </TechnicalSoundRecordingDetails>
    </SoundRecording>${coverBlock}
  </ResourceList>
  <ReleaseList>
    <Release>
      <ReleaseReference>${relRef}</ReleaseReference>
      <ReleaseType>${releaseTypeTag(item)}</ReleaseType>
      <ReleaseId>
        ${releaseIdBlock(item)}
      </ReleaseId>
      <ReferenceTitle>
        <TitleText>${title}</TitleText>
      </ReferenceTitle>
      <ReleaseResourceReferenceList>
        <ReleaseResourceReference ReleaseResourceType="PrimaryResource">${resRef}</ReleaseResourceReference>
      </ReleaseResourceReferenceList>
      <ReleaseDetailsByTerritory>
        <TerritoryCode>Worldwide</TerritoryCode>
        <Title TitleType="FormalTitle">
          <TitleText>${title}</TitleText>
        </Title>
        <DisplayArtist>
          <PartyName FullName="${artist}"/>
          <ArtistRole>MainArtist</ArtistRole>
        </DisplayArtist>${displayArtistFeaturedXml}
        <LabelName FullName="${label}"/>
        <Genre>
          <GenreText>${genre}</GenreText>
        </Genre>
        <PLine>
          <PLineText>${pline}</PLineText>
        </PLine>
        <CLine>
          <CLineText>${cline}</CLineText>
        </CLine>
      </ReleaseDetailsByTerritory>
    </Release>
  </ReleaseList>
  <DealList>
    <ReleaseDeal>
      <DealReleaseReference>${relRef}</DealReleaseReference>
      <Deal>
        <DealTerms>
${territoriesXml}
          <ValidityPeriod>
            <StartDate>${startDate}</StartDate>
          </ValidityPeriod>
          <CommercialModel>SubscriptionModel</CommercialModel>
          <UseType>Stream</UseType>
          <UseType>ConditionalDownload</UseType>
        </DealTerms>
      </Deal>
    </ReleaseDeal>
  </DealList>
  <Comment>${esc(`SMG CIS delivery target: ${opts.deliveryTarget}. Composer/rights: complete separately in aggregator tools if required.`)}</Comment>
</ernm:NewReleaseMessage>
`;
}
