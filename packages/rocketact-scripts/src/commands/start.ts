import fs from "fs";
import webpack from "webpack";
import WebpackDevServer from "webpack-dev-server";
import detectPort from "detect-port";

import {
  error,
  success,
  clearConsole,
  infoBlock,
  info,
  warningBlock,
  warning,
  resolveToAppRoot,
  getValidEntries,
  appRoot
} from "rocketact-dev-utils";

import CoreAPI from "../CoreAPI";
const webConsole = require("rocketact-web-console").default;

export default (api: CoreAPI) => {
  api.registerCommand(
    "start",
    (): Promise<any> => {
      const publicDir = resolveToAppRoot("public");

      process.env.NODE_ENV = "development";
      process.env.PUBLIC_URL = "";

      const validEntries = getValidEntries(appRoot());
      const validEntryRewrites = Object.keys(validEntries).map(item => {
        return {
          from: new RegExp(`${item}`),
          to: `/${item}.html`
        }
      });

      return new Promise((resolve, reject) => {
        const webpackConfig = api.resolveWebpackConfig();
        const devServerOptions: WebpackDevServer.Configuration = {
          disableHostCheck: true,
          overlay: true,
          hot: true,
          host: "127.0.0.1",
          https: !!process.env.HTTPS,
          publicPath: "/",
          contentBase:
            fs.existsSync(publicDir) &&
            fs.lstatSync(publicDir).isDirectory() &&
            publicDir,
          quiet: true,
          stats: {
            colors: true,
          },
          before: (app) => {
            webConsole(app);
          },
          historyApiFallback: {
            rewrites: [
              ...validEntryRewrites,
              {
                from: /^(\/[^/]*\.html)\/.*$/,
                to: (context) => context.match[1],
              },
            ],
          },
        };

        const expectedPort = process.env.PORT ? Number(process.env.PORT) : 3000;

        detectPort(expectedPort, (err, availablePort) => {
          if (err) {
            console.log(error(`${err}`));
          } else {
            clearConsole();
            if (process.env.PORT && availablePort !== expectedPort) {
              console.log(
                `${warningBlock(" WARN ")} ${warning(
                  `Port ${expectedPort} is in use, changing to ${availablePort}\n`
                )}`
              );
            }
            console.log(`${infoBlock(" WAITING ")} ${info("Building...")}`);
            // @ts-ignore
            const compiler = webpack(webpackConfig);
            const devServer = new WebpackDevServer(
              // @ts-ignore
              compiler,
              devServerOptions
            );
            global.ROCKETACT_PORT = availablePort;

            devServer.listen(availablePort, "0.0.0.0", () => {});
          }
        });
      });
    }
  );
};
