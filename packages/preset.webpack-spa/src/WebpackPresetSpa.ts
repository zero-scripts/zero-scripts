import { AbstractPreset } from '@zero-scripts/core';
import webpack from 'webpack';
import fastify from 'fastify';
import { IncomingMessage, Server, ServerResponse } from 'http';
import webpackDevMiddleware from 'webpack-dev-middleware';
import webpackHotMiddleware from 'webpack-hot-middleware';
import { WebpackConfig } from '@zero-scripts/config.webpack';
import { extensions as localExtensions } from './extensions';

export class WebpackPresetSpa extends AbstractPreset {
  constructor() {
    super([]);

    this.scripts.set('start', async ({ options }) => {
      process.env.NODE_ENV = 'development';

      const builder = this.getInstance(WebpackConfig);

      const config = builder
        .setIsDev(true)
        .addEntry(require.resolve('webpack-hot-middleware/client'))
        .pipe(localExtensions)
        .build();

      const compiler = webpack(config);

      if (options.smokeTest) {
        compiler.hooks.failed.tap('smokeTest', async () => {
          setTimeout(() => {
            process.exit(1);
          }, 150);
        });

        compiler.hooks.done.tap('smokeTest', async stats => {
          setTimeout(() => {
            if (stats.hasErrors() || stats.hasWarnings()) {
              process.exit(1);
            } else {
              process.exit(0);
            }
          }, 150);
        });
      }

      const server: fastify.FastifyInstance<
        Server,
        IncomingMessage,
        ServerResponse
      > = fastify();

      server.use(
        webpackDevMiddleware(compiler, {
          stats: config.stats,
          publicPath: (config.output as webpack.Output).publicPath as string,
          logLevel: 'SILENT'
        })
      );

      server.use(
        webpackHotMiddleware(compiler, {
          log: false
        })
      );

      // process.on('SIGINT', async () => {
      //   await server.close();
      //   process.exit(0);
      // });

      await server.listen(8080, err => {
        if (err) throw err;
      });
    });

    this.scripts.set('build', async () => {
      process.env.NODE_ENV = 'production';

      const builder = this.getInstance(WebpackConfig);

      const config = builder
        .setIsDev(false)
        .pipe(localExtensions)
        .build();

      const compiler = webpack(config);

      compiler.run(err => {
        if (err) throw err;
      });
    });
  }
}
