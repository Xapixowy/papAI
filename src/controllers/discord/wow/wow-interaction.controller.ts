import { Injectable, UseGuards } from '@nestjs/common';
import {
  Button,
  type ButtonContext,
  ComponentParam,
  Context,
  SelectedStrings,
  StringSelect,
  type StringSelectContext,
} from 'necord';
import { DiscordButtonId } from '@Enums/discord/discord-button-id.enum';
import { DiscordSelectId } from '@Enums/discord/discord-select-id.enum';
import { DiscordFeature } from '@Enums/discord/discord-feature.enum';
import { RequiresDiscordGuildFeature } from '@Decorators/nest/requires-discord-guild-feature.decorator';
import { DiscordGuildFeatureGuard } from '@Guards/discord/discord-guild-feature.guard';
import { WowInteractionService } from '@Services/wow/wow-interaction.service';
import {
  updateWowFlow,
  wowFlowContext,
} from '@Controllers/discord/wow/wow-interaction-replies';

@Injectable()
@UseGuards(DiscordGuildFeatureGuard)
@RequiresDiscordGuildFeature(DiscordFeature.WOW_FOREVER)
export class WowInteractionController {
  constructor(private readonly flows: WowInteractionService) {}

  @Button(`${DiscordButtonId.WOW_OBSERVER_CONFIRM}/:token`)
  async confirm(
    @Context() [i]: ButtonContext,
    @ComponentParam('token') token: string,
  ): Promise<void> {
    await updateWowFlow(this.flows, i, token, () =>
      this.flows.confirm(token, wowFlowContext(i)),
    );
  }

  @Button(`${DiscordButtonId.WOW_FLOW_CANCEL}/:token`)
  async cancel(
    @Context() [i]: ButtonContext,
    @ComponentParam('token') token: string,
  ): Promise<void> {
    await updateWowFlow(this.flows, i, token, () =>
      this.flows.cancel(token, wowFlowContext(i)),
    );
  }

  @Button(`${DiscordButtonId.WOW_FLOW_PAGE}/:token/:page`)
  async page(
    @Context() [i]: ButtonContext,
    @ComponentParam('token') token: string,
    @ComponentParam('page') page: string,
  ): Promise<void> {
    await updateWowFlow(this.flows, i, token, () =>
      this.flows.page(token, wowFlowContext(i), page),
    );
  }

  @StringSelect(`${DiscordSelectId.WOW_OBSERVER_CHANNEL}/:token`)
  async channel(
    @Context() [i]: StringSelectContext,
    @ComponentParam('token') token: string,
    @SelectedStrings() [channelId]: string[],
  ): Promise<void> {
    await updateWowFlow(this.flows, i, token, () =>
      this.flows.chooseChannel(token, wowFlowContext(i), channelId),
    );
  }

  @StringSelect(`${DiscordSelectId.WOW_CHARACTER}/:token`)
  async character(
    @Context() [i]: StringSelectContext,
    @ComponentParam('token') token: string,
    @SelectedStrings() [slug]: string[],
  ): Promise<void> {
    await updateWowFlow(this.flows, i, token, () =>
      this.flows.chooseCharacter(token, wowFlowContext(i), slug),
    );
  }
}
