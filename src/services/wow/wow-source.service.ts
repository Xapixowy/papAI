import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { isAxiosError } from 'axios';
import {
  WOW_EU_BASE,
  WowCharacter,
  WowRealm,
  WowSourceError,
} from '@Types/wow/wow.type';
import {
  characterSlug,
  parseCharacterHtml,
  parseRealmStatus,
} from '@Services/wow/wow-parser';

@Injectable()
export class WowSourceService {
  private readonly logger = new Logger(WowSourceService.name);
  private readonly inFlight = new Map<string, Promise<unknown>>();

  constructor(private readonly http: HttpService) {}

  character(input: string): Promise<WowCharacter> {
    const slug = characterSlug(input);
    return this.once(`character:${slug}`, async () => {
      let stage = 'request';
      try {
        const response = await firstValueFrom(
          this.http.get<string>(
            `${WOW_EU_BASE}/armory/character/${encodeURIComponent(slug)}`,
            { responseType: 'text', maxRedirects: 0 },
          ),
        );
        stage = 'parse';
        const character = parseCharacterHtml(response.data, slug);
        if (character.unavailableFields?.length)
          this.logger.warn(
            `Partial Armory profile character=${slug} unavailable=${character.unavailableFields.join(',')}`,
          );
        return character;
      } catch (error) {
        const context = `source=armory character=${slug} stage=${stage}`;
        if (error instanceof WowSourceError)
          throw new WowSourceError(
            error.message,
            error.notFound,
            error,
            context,
          );
        if (isAxiosError(error) && error.response?.status === 404) {
          throw new WowSourceError(
            'No EU Armory profile found. Characters must be at least level 10; try again once the profile is available.',
            true,
            error,
            context,
          );
        }
        throw new WowSourceError(
          'Armory is temporarily unavailable. Please try again later.',
          false,
          error,
          context,
        );
      }
    });
  }

  realms(): Promise<WowRealm[]> {
    return this.once('realms', async () => {
      let stage = 'request';
      try {
        const response = await firstValueFrom(
          this.http.post<unknown>(
            'https://worldofwarcraft.blizzard.com/en-gb/graphql',
            {
              operationName: 'GetRealmStatusData',
              variables: {
                input: { compoundRegionGameVersionSlug: 'forever-eu' },
              },
              extensions: {
                persistedQuery: {
                  version: 1,
                  // Observed in Blizzard's realm-status frontend, 2026-11-09.
                  sha256Hash:
                    'e890f42a5375f136b9f9165408fb2bc372cc5f88be0b21e7dc681a70d9999c67',
                },
              },
            },
            {
              headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'Accept-Language': 'en-GB',
                'x-static': 'false',
              },
            },
          ),
        );
        stage = 'parse';
        return parseRealmStatus(response.data);
      } catch (error) {
        const context = `source=realm-status region=eu stage=${stage}`;
        if (error instanceof WowSourceError)
          throw new WowSourceError(
            error.message,
            error.notFound,
            error,
            context,
          );
        throw new WowSourceError(
          'Official EU realm status is temporarily unavailable.',
          false,
          error,
          context,
        );
      }
    });
  }

  private once<T>(key: string, read: () => Promise<T>): Promise<T> {
    const existing = this.inFlight.get(key);
    if (existing) return existing as Promise<T>;
    const pending = read().finally(() => this.inFlight.delete(key));
    this.inFlight.set(key, pending);
    return pending;
  }
}
