class Collision {
    static aabb(rect1, rect2) {
        return (
            rect1.x < rect2.x + rect2.width &&
            rect1.x + rect1.width > rect2.x &&
            rect1.y < rect2.y + rect2.height &&
            rect1.y + rect1.height > rect2.y
        );
    }

    static resolvePlatformCollision(entity, platform) {
        const overlapX = Math.min(
            entity.x + entity.width - platform.x,
            platform.x + platform.width - entity.x
        );
        const overlapY = Math.min(
            entity.y + entity.height - platform.y,
            platform.y + platform.height - entity.y
        );

        if (overlapY < overlapX) {
            if (entity.y < platform.y) {
                entity.y = platform.y - entity.height;
                entity.onGround = true;
                entity.velocityY = 0;
            } else {
                entity.y = platform.y + platform.height;
                entity.velocityY = 0;
            }
        } else {
            if (entity.x < platform.x) {
                entity.x = platform.x - entity.width;
            } else {
                entity.x = platform.x + platform.width;
            }
            entity.velocityX = 0;
        }
    }

    static checkPlatformCollisions(entity, platforms) {
        entity.onGround = false;

        platforms.forEach(platform => {
            if (this.aabb(entity, platform)) {
                this.resolvePlatformCollision(entity, platform);
            }
        });
    }
}
