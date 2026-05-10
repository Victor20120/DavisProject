# Re-exports the things other files most commonly need from core/.
# Instead of:
#   from core.config import settings
#   from core.logging import logger
#   from core.deps import get_current_user
#
# You can just do:
#   from core import settings, logger, get_current_user

from core.config import settings
from core.logging import logger
from core.deps import get_current_user
