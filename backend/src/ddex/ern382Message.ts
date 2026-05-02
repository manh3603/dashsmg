import { v4 as uuidv4 } from "uuid";
import type { CatalogItem } from "../types.js";
import type { DdexMessageOpts } from "./ddexMessageOpts.js";

const NS = "http://ddex.net/xml/ern/382";

function langScriptCode(item: CatalogItem): string {
  const l = (item.language ?? "").toLowerCase();
  if (l.includes("việt") || l === "vi") return "vi";
  if (l.includes("english") || l === "en") return "en";
  if (l.includes("instrumental")) return "zxx";
  if (l.includes("rus") || l.includes("nga")) return "ru-Latn";
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
  const upc = item.upc?.replace(/\s/g, "") ?? "";
  const isrc = item.isrc?.replace(/[-\s]/g, "") ?? "";
  if (item.type === "Album/EP" && /^\d{12,13}$/.test(upc)) {
    return `<ICPN IsEan="true">${esc(upc)}</ICPN>`;
  }
  if (item.type === "Single" && isrc.length >= 12) {
    return `<ISRC>${esc(item.isrc!.trim())}</ISRC>`;
  }
  return `<ProprietaryId Namespace="urn:smg:release">${esc(item.id)}</ProprietaryId>`;
}

function releaseTypeTag(item: CatalogItem): string {
  return item.type === "Single" ? "Single" : "Album";
}

function soundDurationPt(item: CatalogItem): string {
  const d = item.durationIso8601?.trim();
  if (d && /^PT/i.test(d)) return esc(d);
  const env = process.env.DDEX_DEFAULT_AUDIO_DURATION_PT?.trim();
  if (env && /^PT/i.test(env)) return esc(env);
  return "PT3M0.000S";
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

function plineText(item: CatalogItem): string {
  const raw = item.pline?.trim();
  if (raw) return esc(raw);
  return esc(`℗ ${new Date().getFullYear()} ${item.artist || "Artist"}`);
}

function clineText(item: CatalogItem): string {
  const raw = item.cline?.trim();
  if (raw) return esc(raw);
  return esc(`© ${new Date().getFullYear()} ${item.artist || "Artist"}`);
}

/**
 * ERN 3.8.2 NewReleaseMessage — căn hướng dẫn tích hợp (3.71 / 3.82 / 3.83, ưu tiên 3.82):
 * ICPN cho album chính, ISRC + Duration + ngày phát hành gốc cho sound recording,
 * IndirectResourceContributor cho composer, PLine/CLine giữ nguyên văn bản người dùng khi có.
 */
export function buildErn382NewReleaseMessage(item: CatalogItem, opts: DdexMessageOpts): string {
  const messageId = uuidv4();
  const created = new Date().toISOString();
  const titleBase = esc(item.title);
  const title = item.version?.trim() ? `${titleBase} (${esc(item.version.trim())})` : titleBase;
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
  const pline = plineText(item);
  const cline = clineText(item);
  const startDate = esc(item.releaseDate?.trim() || new Date().toISOString().slice(0, 10));
  const audioUrl = item.audioAssetUrl?.trim() || "";
  const durationEl = soundDurationPt(item);
  const resRef = "A1";
  const imgRef = "IMG1";
  const relRef = "R0";
  const isMainRelease = item.type === "Album/EP" ? "true" : "false";

  const composer = item.composer?.trim();
  const indirectComposerXml = composer
    ? `
        <IndirectResourceContributor>
          <PartyName FullName="${esc(composer)}"/>
          <ArtistRole>Composer</ArtistRole>
        </IndirectResourceContributor>`
    : "";

  const territoriesXml = opts.territoryCodes.map((c) => `        <TerritoryCode>${esc(c)}</TerritoryCode>`).join("\n");

  const includeUgv = (process.env.DDEX_INCLUDE_UGV_DEAL ?? "").toLowerCase() === "true";
  const ugvNs = esc(process.env.DDEX_UGV_COMMERCIAL_MODEL_NAMESPACE?.trim() || "DPID:DDEX_DNK");

  const ugvDealXml = includeUgv
    ? `
    <ReleaseDeal>
      <DealReleaseReference>${relRef}</DealReleaseReference>
      <Deal>
        <DealTerms>
${territoriesXml}
          <ValidityPeriod>
            <StartDate>${startDate}</StartDate>
          </ValidityPeriod>
          <CommercialModelType Namespace="${ugvNs}" UserDefinedValue="UserGeneratedVideo">UserDefined</CommercialModelType>
          <Usage>
            <UseType>OnDemandStream</UseType>
          </Usage>
        </DealTerms>
      </Deal>
    </ReleaseDeal>`
    : "";

  const coverBlock = imageSection(item, imgRef);
  const hasCover = Boolean(item.coverAssetUrl?.trim() && /^https?:\/\//i.test(item.coverAssetUrl.trim()));

  const hasIsrc =
    Boolean(item.isrc?.trim()) && item.isrc !== "—" && item.isrc !== "-";
  const isrcInner = hasIsrc ? `<ISRC>${esc(item.isrc!.trim())}</ISRC>` : "";

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<NewReleaseMessage xmlns="http://ddex.net/xml/ern/382"
  xmlns:xs="http://www.w3.org/2001/XMLSchema-instance"
  xs:schemaLocation="${NS} http://ddex.net/xml/ern/382/release-notification.xsd"
  MessageSchemaVersionId="ern/382"
  LanguageAndScriptCode="${esc(lang)}">
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
      <PartyReference>PARTY_ARTIST1</PartyReference>
      <PartyName FullName="${artist}"/>
    </Party>
    <Party>
      <PartyReference>PARTY_LABEL1</PartyReference>
      <PartyName FullName="${label}"/>
    </Party>
  </PartyList>
  <ResourceList>
    <SoundRecording>
      <SoundRecordingType>MusicalWorkSoundRecording</SoundRecordingType>
      <SoundRecordingId>
        ${isrcInner || `<ProprietaryId Namespace="urn:smg:recording">${esc(item.id)}</ProprietaryId>`}
      </SoundRecordingId>
      <ResourceReference>${resRef}</ResourceReference>
      <ReferenceTitle>
        <TitleText>${title}</TitleText>
      </ReferenceTitle>
      <Duration>${durationEl}</Duration>
      <SoundRecordingDetailsByTerritory>
        <TerritoryCode>Worldwide</TerritoryCode>
        <Title TitleType="FormalTitle">
          <TitleText>${title}</TitleText>
        </Title>
        <DisplayArtist>
          <PartyName FullName="${artist}"/>
          <ArtistRole>MainArtist</ArtistRole>
        </DisplayArtist>${displayArtistFeaturedXml}${indirectComposerXml}
        <OriginalResourceReleaseDate>
          <Date>${startDate}</Date>
        </OriginalResourceReleaseDate>
        <PLine>
          <PLineText>${pline}</PLineText>
        </PLine>
        <Genre>
          <GenreText>${genre}</GenreText>
        </Genre>
        <TechnicalSoundRecordingDetails>
          <TechnicalResourceDetails>
            <File>
              <URL>${esc(audioUrl)}</URL>
            </File>
          </TechnicalResourceDetails>
        </TechnicalSoundRecordingDetails>
      </SoundRecordingDetailsByTerritory>
    </SoundRecording>${coverBlock}
  </ResourceList>
  <ReleaseList>
    <Release IsMainRelease="${isMainRelease}">
      <ReleaseReference>${relRef}</ReleaseReference>
      <ReleaseType>${releaseTypeTag(item)}</ReleaseType>
      <ReleaseId>
        ${releaseIdBlock(item)}
      </ReleaseId>
      <ReferenceTitle>
        <TitleText>${title}</TitleText>
      </ReferenceTitle>
      <ReleaseResourceReferenceList>
        <ReleaseResourceReference>${resRef}</ReleaseResourceReference>${
          hasCover ? `\n        <ReleaseResourceReference>${imgRef}</ReleaseResourceReference>` : ""
        }
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
          <Usage>
            <UseType>Stream</UseType>
          </Usage>
          <Usage>
            <UseType>OnDemandStream</UseType>
          </Usage>
          <Usage>
            <UseType>ConditionalDownload</UseType>
          </Usage>
        </DealTerms>
      </Deal>
    </ReleaseDeal>${ugvDealXml}
  </DealList>
  <Comment>${esc(`DDEX ERN 3.8.2 — delivery target: ${opts.deliveryTarget}. SFTP batch rules & file order per partner integration guide.`)}</Comment>
</NewReleaseMessage>
`;
}
