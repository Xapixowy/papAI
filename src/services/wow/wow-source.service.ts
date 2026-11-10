import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
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
  private readonly inFlight = new Map<string, Promise<unknown>>();

  constructor(private readonly http: HttpService) {}

  character(input: string): Promise<WowCharacter> {
    const slug = characterSlug(input);
    return this.once(`character:${slug}`, async () => {
      try {
        const response = await firstValueFrom(
          this.http.get<string>(
            `${WOW_EU_BASE}/armory/character/${encodeURIComponent(slug)}`,
            { responseType: 'text', maxRedirects: 0 },
          ),
        );
        return parseCharacterHtml(response.data, slug);
      } catch (error) {
        if (error instanceof WowSourceError) throw error;
        if (isAxiosError(error) && error.response?.status === 404) {
          throw new WowSourceError(
            'Brak profilu w Armory EU. Postać musi mieć co najmniej 10. poziom; spróbuj po pojawieniu się profilu.',
            true,
          );
        }
        throw new WowSourceError(
          'Armory jest chwilowo niedostępne. Spróbuj ponownie później.',
        );
      }
    });
  }

  realms(): Promise<WowRealm[]> {
    return this.once('realms', async () => {
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
        return parseRealmStatus(response.data);
      } catch (error) {
        if (error instanceof WowSourceError) throw error;
        throw new WowSourceError(
          'Oficjalny status EU jest chwilowo niedostępny.',
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
