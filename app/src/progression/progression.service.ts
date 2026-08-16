import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "../auth/user.entity";
import { XpLog } from "./xp-log.entity";
import { RewardReason, XP_REWARDS } from "./rewards";

export const COIN_ITEMS = {
  STREAK_SHIELD: {
    price: 100,
    description: "Protects one missed daily login",
  },
  XP_BOOST: {
    price: 150,
    description: "Earn 25% bonus XP for 24 hours",
  },
  CHALLENGE_REROLL: {
    price: 75,
    description: "Replace today's challenge",
  },
  PROFILE_THEME: {
    price: 300,
    description: "Unlock an exclusive profile theme",
  },
  AI_CREDIT: {
    price: 50,
    description: "One additional AI generation",
  },
} as const;

@Injectable()
export class ProgressionService {
  constructor(
      @InjectRepository(User)
      private readonly users: Repository<User>,
      @InjectRepository(XpLog)
      private readonly xpLogs: Repository<XpLog>,
  ) {}

  // ---------------------------------------------------------------------------
  // PUBLIC PROGRESSION API
  // ---------------------------------------------------------------------------

  async getProgress(userId: number) {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException("User not found");
    return this.progressFor(user);
  }

  xpRequiredForLevel(level: number): number {
    return Math.floor(100 * Math.pow(level, 1.5));
  }

  async awardXp(
      userId: number,
      reason: RewardReason,
      bonusXp = 0,
      metadata?: string,
  ) {
    const user = await this.users.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    let amount = XP_REWARDS[reason] + bonusXp;

    // Apply active 25% XP Boost modifier if active
    if (user.xpBoostExpiresAt && new Date(user.xpBoostExpiresAt) > new Date()) {
      amount = Math.round(amount * 1.25);
    }

    user.totalXp += amount;

    // Calculate level progression
    const newLevel = this.levelFromXp(user.totalXp);
    const leveledUp = newLevel > user.level;

    // Award 10 bonus coins per level gained
    if (leveledUp) {
      const levelDiff = newLevel - user.level;
      user.coins += levelDiff * 10;
      user.level = newLevel;
    }

    await this.users.save(user);

    // Save entry to audit log
    await this.xpLogs.save(
        this.xpLogs.create({
          userId,
          amount,
          reason,
          metadata,
        }),
    );

    return {
      ...this.progressFor(user),
      leveledUp,
      xpGained: amount,
    };
  }

  // ---------------------------------------------------------------------------
  // GITHUB REPOSITORY & COMMIT LINKING
  // ---------------------------------------------------------------------------

  /**
   * Links a user's GitHub username to their app profile
   */
  async linkGithubAccount(userId: number, githubUsername: string) {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException("User not found");

    user.githubUsername = githubUsername.toLowerCase();
    await this.users.save(user);

    return this.awardXp(
        userId,
        "GITHUB_REPO_LINKED",
        0,
        `Linked @${githubUsername}`,
    );
  }

  /**
   * Process incoming commits from Webhooks and award XP.
   * Includes commit deduplication using the Commit SHA hash.
   */
  async processGithubCommit(
      githubUsername: string,
      commitHash: string,
      commitMessage: string,
      repoName: string,
  ) {
    // 1. Find user by linked GitHub handle
    const user = await this.users.findOne({
      where: { githubUsername: githubUsername.toLowerCase() },
    });

    if (!user) {
      return {
        status: "ignored",
        reason: "GitHub account not linked to any user",
      };
    }

    // 2. Prevent duplicate XP for the same commit (Deduplication check)
    const existingLog = await this.xpLogs.findOne({
      where: { userId: user.id, metadata: commitHash },
    });

    if (existingLog) {
      return { status: "ignored", reason: "Commit already rewarded" };
    }

    // 3. Optional Bonus XP: Check if commit references an app task ID
    let bonusXp = 0;
    if (/#task-\d+/i.test(commitMessage)) {
      bonusXp += 25; // Bonus XP for linking commits to tasks
    }

    // 4. Award commit XP
    const result = await this.awardXp(
        user.id,
        "GITHUB_COMMIT",
        bonusXp,
        commitHash,
    );

    return {
      status: "success",
      userId: user.id,
      commitHash,
      repoName,
      ...result,
    };
  }

  // ---------------------------------------------------------------------------
  // SHOP & CURRENCY LOGIC
  // ---------------------------------------------------------------------------

  async spendCoins(userId: number, amount: number) {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException("User not found");

    if (amount <= 0) throw new BadRequestException("Amount must be positive");
    if (user.coins < amount) throw new BadRequestException("Not enough coins");

    user.coins -= amount;
    await this.users.save(user);

    return { coins: user.coins };
  }

  async purchaseItem(userId: number, item: keyof typeof COIN_ITEMS) {
    const product = COIN_ITEMS[item];
    if (!product) throw new BadRequestException("Unknown shop item");

    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException("User not found");

    if (user.coins < product.price) {
      throw new BadRequestException("Not enough coins");
    }

    // Apply item features
    switch (item) {
      case "STREAK_SHIELD":
        user.streakShields = (user.streakShields || 0) + 1;
        break;
      case "XP_BOOST":
        const now = new Date();
        const currentExpiry =
            user.xpBoostExpiresAt && new Date(user.xpBoostExpiresAt) > now
                ? new Date(user.xpBoostExpiresAt)
                : now;
        user.xpBoostExpiresAt = new Date(
            currentExpiry.getTime() + 24 * 60 * 60 * 1000,
        );
        break;
      case "AI_CREDIT":
        user.aiCredits = (user.aiCredits || 0) + 1;
        break;
    }

    user.coins -= product.price;
    await this.users.save(user);

    return {
      item,
      message: `${product.description} unlocked`,
      coins: user.coins,
      xpBoostExpiresAt: user.xpBoostExpiresAt,
    };
  }

  // ---------------------------------------------------------------------------
  // PRIVATE HELPER METHODS
  // ---------------------------------------------------------------------------

  private levelFromXp(totalXp: number): number {
    let level = 1;
    while (totalXp >= this.xpRequiredForLevel(level + 1)) {
      level++;
    }
    return level;
  }

  private progressFor(user: User) {
    const levelStartXp = this.xpRequiredForLevel(user.level);
    const nextLevelXp = this.xpRequiredForLevel(user.level + 1);

    const currentXp = user.totalXp - levelStartXp;
    const requiredXp = nextLevelXp - levelStartXp;

    return {
      level: user.level,
      totalXp: user.totalXp,
      currentXp: Math.max(currentXp, 0),
      requiredXp,
      progressPercent: Math.min(
          100,
          Math.round((currentXp / requiredXp) * 100),
      ),
      coins: user.coins,
      githubUsername: user.githubUsername,
    };
  }
}