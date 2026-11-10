import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { HttpService } from '@nestjs/axios';
import { Logger } from '@nestjs/common';
import { AxiosError, AxiosHeaders } from 'axios';
import { throwError } from 'rxjs';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { WowCommandsService } from '@Services/wow/wow-commands.service';
import { WowSourceService } from '@Services/wow/wow-source.service';
import { parseCharacterHtml } from '@Services/wow/wow-parser';
import { WowSourceError } from '@Types/wow/wow.type';

function httpFailure(status = 500): AxiosError {
  const config = {
    method: 'get',
    url: 'https://user:private-password@worldofwarcraft.blizzard.com/en-gb/forever/eu/armory/character/lupidoptera-viridis?token=private-query',
    headers: new AxiosHeaders({ Authorization: 'private-header' }),
  };
  return new AxiosError(
    'Request failed with status code ' + status,
    'ERR_BAD_RESPONSE',
    config,
    undefined,
    {
      status,
      statusText: 'Internal Server Error',
      config,
      headers: { 'set-cookie': 'private-cookie' },
      data: 'private-response-body',
    },
  );
}

function commands(): WowCommandsService {
  const service = Object.create(
    WowCommandsService.prototype,
  ) as WowCommandsService;
  return Object.assign(service, {
    logger: new Logger(WowCommandsService.name),
    embeds: { message: () => [] },
  });
}

describe('WoW console diagnostics', () => {
  afterEach(() => jest.restoreAllMocks());

  it.each([404, 500])(
    'retains the HTTP %i cause for source failures',
    async (status) => {
      const http = new HttpService();
      const error = httpFailure(status);
      jest.spyOn(http, 'get').mockReturnValue(throwError(() => error));
      await expect(
        new WowSourceService(http).character('Lupidoptera Viridis'),
      ).rejects.toMatchObject({
        cause: error,
        notFound: status === 404,
      });
    },
  );

  it('logs handled HTTP failures without dumping request or response secrets', async () => {
    const warn = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => {});
    await expect(
      commands().execute(() =>
        Promise.reject(
          new WowSourceError(
            'Armory is temporarily unavailable.',
            false,
            httpFailure(),
          ),
        ),
      ),
    ).resolves.toEqual([]);
    expect(warn).toHaveBeenCalledTimes(1);
    const log = warn.mock.calls.flat().map(String).join(' ');
    expect(log).toContain('500');
    expect(log).toContain('lupidoptera-viridis');
    for (const secret of [
      'private-password',
      'private-query',
      'private-header',
      'private-cookie',
      'private-response-body',
    ])
      expect(log).not.toContain(secret);
  });

  it('reports invalid JSON without echoing source content from syntax errors', async () => {
    const warn = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => {});
    await commands().execute(() =>
      Promise.resolve(
        parseCharacterHtml(
          '<script id="character-profile-mount-initial-state">var characterProfileInitialState = private-response-body;</script>',
          'judgement-judy',
        ),
      ).then(() => []),
    );
    const log = warn.mock.calls.flat().map(String).join(' ');
    expect(log).toContain('SyntaxError');
    expect(log).not.toContain('private-response-body');
  });

  it('logs the failed schema field instead of silently discarding validation details', async () => {
    const warn = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => {});
    const profile = JSON.parse(
      readFileSync(join(__dirname, '__fixtures__/character.json'), 'utf8'),
    ) as { character: Record<string, unknown> };
    profile.character.level = 'private-profile-value';
    await commands().execute(() =>
      Promise.resolve(
        parseCharacterHtml(
          `<script id="character-profile-mount-initial-state">var characterProfileInitialState = ${JSON.stringify(profile)};</script>`,
          'judgement-judy',
        ),
      ).then(() => []),
    );
    const log = warn.mock.calls.flat().map(String).join(' ');
    expect(log).toContain('character.level');
    expect(log).toContain('invalid_type');
    expect(log).not.toContain('private-profile-value');
  });
});
