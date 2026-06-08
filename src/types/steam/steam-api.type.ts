export interface SteamPlayerSummary {
  steamid: string;
  communityvisibilitystate: 1 | 3;
  personaname: string;
  avatarfull: string;
  profileurl: string;
  personastate: number;
}

export interface SteamOwnedGame {
  appid: number;
  name: string;
  img_icon_url: string;
  playtime_forever: number;
  playtime_2weeks?: number;
  rtime_last_played?: number;
}

export interface SteamAppDetails {
  name: string;
  steam_appid: number;
  is_free: boolean;
  short_description: string;
  header_image: string;
  platforms: {
    windows: boolean;
    mac: boolean;
    linux: boolean;
  };
  metacritic?: {
    score: number;
    url: string;
  };
  categories?: Array<{ id: number; description: string }>;
  genres?: Array<{ id: string; description: string }>;
  screenshots?: Array<{
    id: number;
    path_thumbnail: string;
    path_full: string;
  }>;
  achievements?: { total: number };
  release_date?: { coming_soon: boolean; date: string };
  developers?: string[];
  publishers?: string[];
  price_overview?: {
    currency: string;
    final: number;
    final_formatted: string;
  };
}

export interface SteamPendingObserver {
  steamId: string;
  username: string;
  avatarUrl: string | null;
  profileUrl: string | null;
  isProfilePublic: boolean;
  isGamesPublic: boolean;
}
