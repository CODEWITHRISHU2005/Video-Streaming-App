# syntax=docker/dockerfile:1

################################################################################

# Create a stage for resolving and downloading dependencies.
FROM eclipse-temurin:21-jdk-jammy as deps

WORKDIR /build

# Copy the mvnw wrapper with executable permissions.
COPY --chmod=0755 mvnw mvnw
COPY .mvn/ .mvn/

# Download dependencies as a separate step to take advantage of Docker's caching.
# Copy pom.xml first for better layer caching
COPY pom.xml .
RUN ./mvnw dependency:go-offline -DskipTests

################################################################################

# Create a stage for building the application based on the stage with downloaded dependencies.
FROM deps as package

WORKDIR /build

COPY ./src src/
COPY pom.xml .
RUN ./mvnw package -DskipTests && \
    mv target/$(./mvnw help:evaluate -Dexpression=project.artifactId -q -DforceStdout)-$(./mvnw help:evaluate -Dexpression=project.version -q -DforceStdout).jar target/app.jar

################################################################################

# Create a stage for extracting the application into separate layers.
FROM package as extract

WORKDIR /build

RUN java -Djarmode=layertools -jar target/app.jar extract --destination target/extracted

################################################################################

# Create a new stage for running the application that contains the minimal
# runtime dependencies for the application.
FROM eclipse-temurin:21-jre-jammy AS final

# Create a non-privileged user first
ARG UID=10001
RUN adduser \
    --disabled-password \
    --gecos "" \
    --home "/nonexistent" \
    --shell "/sbin/nologin" \
    --no-create-home \
    --uid "${UID}" \
    appuser

# Create upload directories with proper ownership
RUN mkdir -p /app/uploads && \
    mkdir -p /app/videos_hsl && \
    chown -R appuser:appuser /app && \
    chmod -R 755 /app

# Switch to non-root user
USER appuser

WORKDIR /app

# Copy the executable from the "extract" stage
COPY --from=extract --chown=appuser:appuser build/target/extracted/dependencies/ ./
COPY --from=extract --chown=appuser:appuser build/target/extracted/spring-boot-loader/ ./
COPY --from=extract --chown=appuser:appuser build/target/extracted/snapshot-dependencies/ ./
COPY --from=extract --chown=appuser:appuser build/target/extracted/application/ ./

ENV PORT=8080
ENV SPRING_PROFILES_ACTIVE=prod

EXPOSE ${PORT}

ENTRYPOINT [ "java", "org.springframework.boot.loader.launch.JarLauncher" ]