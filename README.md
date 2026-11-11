<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Discord Bingo (0.8.3)

Bingo uses reusable server-owned phrase pools and one active shared game per channel. Boards support 3×3, 4×4, and 5×5 layouts, with tile-only images, a primary Mark a cell button opening a private dropdown, and a separate unmark action. Game progress and drawn phrases persist across bot restarts and later pool edits.

The main-branch deployment builds the app image, applies database migrations with `npm run migration:run`, then restarts the bot only if migration succeeds. For manual deployments, apply migrations before starting the updated bot. A bot super administrator then enables `BINGO` with `/guild feature add`, registers the channel with `/channel add` if necessary, and enables `BINGO` through `/channel feature set` with `value: true`.

Once a board is posted, use its buttons for everyday actions:

- **Mark a cell** is the primary button and opens a private selector containing unmarked cells.
- **Add phrase** opens a private form for this board's set; owner/contributor access still applies.
- **Phrases** opens the paginated phrase pool directly.
- **Unmark a cell** opens the existing private undo selector.

These controls work after restarts. Form submissions recheck access; old confirmations cannot end a newer game. New games and ending games use `/bingo game start` and `/bingo game end`; lifecycle management is not displayed under the image. Other slash commands remain available for initial setup and set/contributor administration.

The bot needs **View Channel**, **Send Messages**, **Attach Files**, and **Read Message History** in each bingo channel. Bingo does not require message-content or reaction intents.

- `/bingo set create name`: create a set. Other set commands open a private menu of named sets; `list`/`show` let you browse phrases with Previous/Next buttons. Database IDs are never displayed or entered.
- `/bingo contributor add user` and `remove user`: select a server member, then choose the set from a private menu.
- `/bingo phrase add text`: choose the destination set. `/bingo phrase edit text` and `/bingo phrase remove` ask you to choose a set and then a phrase. Contributors maintain their own phrases; the owner can maintain every phrase.
- `/bingo game start size`: choose a size, then select the set from a menu. The set owner or a user with **Manage Channels** can start or end games.
- `/bingo game show`: display the active board; the owner or a channel manager can restore a deleted board message without losing progress.

Private selection menus expire after ten minutes and are bound to the invoking user and channel. Menus paginate beyond 25 entries and recheck permissions before applying a choice.

Any channel member can mark cells. Unmarking requires authorship of the mark, set ownership, or **Manage Channels**. Only the first bingo is announced in each game, without mentions. Archiving a set prevents new games but leaves existing games playable.

All bot-authored bingo content is in English; user-entered names and phrases are not translated. Errors are logged to the console with operation and Discord identifiers plus diagnostic codes and stack locations, without dumping tokens, request payloads, or SQL parameters. Failed board updates keep their persisted progress and are retried every 30 seconds; a deleted board requires an authorized `/bingo game show`.

Run unit and command-registration checks with `npm test -- --runInBand`. Database workflow checks additionally require `BINGO_TEST_POSTGRES_URL` pointing to a dedicated local database named `pap_ai_bingo_test`; this suite clears its test data and exercises migration rollback. Selection-flow checks also require `BINGO_TEST_REDIS_URL` pointing to a dedicated local Redis on port 56380, database 14. The database must never contain production data. Simulated Discord transport tests must be followed by live acceptance checks on a test server.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
