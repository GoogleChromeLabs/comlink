FROM selenium/node-chrome:latest@sha256:69aa80a8766f9ab9ab0adb292e5d5e5d4c455d72337e4557480de4eb1c7906d8

USER root

RUN apt-get update -qqy \
  && apt-get -qqy install nodejs npm \
  && rm -rf /var/lib/apt/lists/* /var/cache/apt/* \
  && rm /bin/sh && ln -s /bin/bash /bin/sh \
  && chown seluser /usr/local

ENV NVM_DIR /usr/local/nvm
RUN wget -qO- https://raw.githubusercontent.com/creationix/nvm/v0.33.2/install.sh | bash \
  && source $NVM_DIR/nvm.sh \
  && nvm install v8

ENV CHROME_BIN /opt/google/chrome/chrome
ENV INSIDE_DOCKER=1

WORKDIR /usr/src
ENTRYPOINT source $NVM_DIR/nvm.sh && npm i && npm test
