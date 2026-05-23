# Stage 1: Build the application
FROM eclipse-temurin:17-jdk-jammy AS build
WORKDIR /app

# Copy maven wrapper and pom.xml
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./

# Make the wrapper executable (Windows file permissions fallback)
RUN chmod +x ./mvnw

# Pre-download dependencies to optimize subsequent build times
RUN ./mvnw dependency:go-offline

# Copy source code
COPY src ./src

# Build the executable fat jar, skipping tests for faster deployment
RUN ./mvnw clean package -DskipTests

# Stage 2: Create the minimal runtime image
FROM eclipse-temurin:17-jre-jammy
WORKDIR /app

# Copy the built jar from the previous stage
# Note: The output filename depends on the <finalName> in pom.xml, which is set to 'pirmaph'
COPY --from=build /app/target/pirmaph.jar app.jar

# Expose the standard Spring Boot port
EXPOSE 8080

# Run the application
ENTRYPOINT ["java", "-jar", "app.jar"]
