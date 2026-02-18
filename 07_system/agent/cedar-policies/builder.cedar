// Cedar policies for the Nitara Builder Agent (nitara-builder)
// Used by Leash containerization to enforce kernel-level safety.
// See: https://www.cedarpolicy.com/ and https://github.com/strongdm/leash

// Allow builder to write within project directories
permit(
  principal == Agent::"nitara-builder",
  action in [Action::"fs:write", Action::"fs:create", Action::"fs:delete"],
  resource in Directory::"/srv/focus-flow/02_projects/"
);

// Allow builder to read from anywhere in the vault (for context)
permit(
  principal == Agent::"nitara-builder",
  action in [Action::"fs:read"],
  resource in Directory::"/srv/focus-flow/"
);

// Forbid writing to system configuration
forbid(
  principal == Agent::"nitara-builder",
  action in [Action::"fs:write", Action::"fs:create", Action::"fs:delete"],
  resource in Directory::"/srv/focus-flow/07_system/"
);

// Forbid writing to agent infrastructure
forbid(
  principal == Agent::"nitara-builder",
  action in [Action::"fs:write", Action::"fs:create", Action::"fs:delete"],
  resource in Directory::"/srv/focus-flow/.claude/"
);

// Forbid writing to profile data
forbid(
  principal == Agent::"nitara-builder",
  action in [Action::"fs:write", Action::"fs:create", Action::"fs:delete"],
  resource in Directory::"/srv/focus-flow/10_profile/"
);

// Allow localhost network connections only (for build verification, health checks)
permit(
  principal == Agent::"nitara-builder",
  action in [Action::"network:connect"],
  resource
) when { resource.host == "localhost" || resource.host == "127.0.0.1" };

// Forbid all other network connections
forbid(
  principal == Agent::"nitara-builder",
  action in [Action::"network:connect"],
  resource
) unless { resource.host == "localhost" || resource.host == "127.0.0.1" };

// Allow process execution for build tools
permit(
  principal == Agent::"nitara-builder",
  action in [Action::"process:exec"],
  resource
) when {
  resource.command in ["npm", "npx", "node", "tsc", "git", "systemctl"]
};

// Forbid dangerous process execution
forbid(
  principal == Agent::"nitara-builder",
  action in [Action::"process:exec"],
  resource
) when {
  resource.command in ["rm", "dd", "mkfs", "shutdown", "reboot", "passwd", "su", "sudo"]
};
