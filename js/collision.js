class Collision {
    static aabb(rect1, rect2) {
        return (
            rect1.x < rect2.x + rect2.width &&
            rect1.x + rect1.width > rect2.x &&
            rect1.y < rect2.y + rect2.height &&
            rect1.y + rect1.height > rect2.y
        );
    }

    // Resuelve solapes con plataformas. Deja en entity.ground la plataforma pisada
    // (para que las plataformas móviles arrastren a quien está encima).
    // Las plataformas flotantes son de un solo sentido: se atraviesan desde abajo
    // y por los lados, y solo frenan a quien cae sobre ellas. El suelo es sólido.
    static checkPlatformCollisions(entity, platforms) {
        entity.onGround = false;
        entity.ground = null;
        if (entity.touchingWall !== undefined) {
            entity.touchingWall = 0;
        }

        platforms.forEach(platform => {
            if (!this.aabb(entity, platform)) return;

            if (!platform.ground) {
                const prevBottom = entity.y + entity.height - entity.velocityY;
                if (entity.velocityY < 0 || prevBottom > platform.y + 1) return;
                entity.y = platform.y - entity.height;
                entity.onGround = true;
                entity.ground = platform;
                entity.velocityY = 0;
                if (entity.jumpsLeft !== undefined) {
                    entity.jumpsLeft = entity.maxJumps;
                }
                return;
            }

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
                    entity.ground = platform;
                    entity.velocityY = 0;
                    if (entity.jumpsLeft !== undefined) {
                        entity.jumpsLeft = entity.maxJumps;
                    }
                } else {
                    entity.y = platform.y + platform.height;
                    entity.velocityY = 0;
                }
            } else {
                const wallSide = entity.x < platform.x ? 1 : -1;
                entity.x = wallSide === 1 ? platform.x - entity.width : platform.x + platform.width;
                if (entity.touchingWall !== undefined && !entity.onGround && entity.velocityY > 0) {
                    entity.touchingWall = wallSide;
                    entity.velocityY *= 0.8; // Deslizar por la pared
                }
                entity.velocityX = 0;
            }
        });
    }
}

if (typeof module !== 'undefined') module.exports = Collision;
